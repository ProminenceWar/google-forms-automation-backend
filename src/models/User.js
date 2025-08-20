/**
 * @fileoverview Modelo de Usuario
 * @description Define el esquema y modelo para usuarios del sistema
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../constants');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        select: false // No incluir en consultas por defecto
    },
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    role: {
        type: String,
        required: [true, 'El rol es requerido'],
        enum: {
            values: Object.values(USER_ROLES),
            message: 'Rol inválido'
        },
        default: USER_ROLES.TECHNICIAN
    },
    company: {
        type: String,
        required: [true, 'La compañía es requerida'],
        trim: true,
        maxlength: [100, 'El nombre de la compañía no puede exceder 100 caracteres']
    },
    active: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    refreshTokens: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        }
    }],
    profile: {
        phone: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s\-\(\)]+$/, 'Número de teléfono inválido']
        },
        avatar: {
            type: String,
            default: null
        },
        timezone: {
            type: String,
            default: 'America/Mexico_City'
        },
        language: {
            type: String,
            default: 'es',
            enum: ['es', 'en']
        }
    },
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        }
    },
    metadata: {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        createdFrom: {
            ip: String,
            userAgent: String
        }
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.refreshTokens;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// Índices
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ company: 1 });
userSchema.index({ active: 1 });
userSchema.index({ createdAt: -1 });

// Virtual para verificar si la cuenta está bloqueada
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pre-save para hashear contraseña
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Método para incrementar intentos de login fallidos
userSchema.methods.incLoginAttempts = function () {
    // Si ya hay un bloqueo y no ha expirado, solo retornar
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: {
                loginAttempts: 1,
                lockUntil: 1
            }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Bloquear después de 5 intentos fallidos
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 horas
        };
    }

    return this.updateOne(updates);
};

// Método para resetear intentos de login
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockUntil: 1
        },
        $set: {
            lastLogin: new Date()
        }
    });
};

// Método para agregar refresh token
userSchema.methods.addRefreshToken = function (token, expiresAt) {
    this.refreshTokens.push({
        token,
        expiresAt
    });

    // Mantener solo los últimos 5 tokens
    if (this.refreshTokens.length > 5) {
        this.refreshTokens = this.refreshTokens.slice(-5);
    }

    return this.save();
};

// Método para remover refresh token
userSchema.methods.removeRefreshToken = function (token) {
    this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
    return this.save();
};

// Método para limpiar tokens expirados
userSchema.methods.cleanExpiredTokens = function () {
    const now = new Date();
    this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > now);
    return this.save();
};

// Método estático para buscar por credenciales
userSchema.statics.findByCredentials = async function (email, password) {
    const user = await this.findOne({ email, active: true }).select('+password');

    if (!user) {
        throw new Error('Credenciales inválidas');
    }

    if (user.isLocked) {
        throw new Error('Cuenta bloqueada temporalmente');
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        await user.incLoginAttempts();
        throw new Error('Credenciales inválidas');
    }

    await user.resetLoginAttempts();
    return user;
};

// Método estático para buscar usuarios activos
userSchema.statics.findActive = function (filter = {}) {
    return this.find({ ...filter, active: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
