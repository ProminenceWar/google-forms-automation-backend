/**
 * @fileoverview Controlador de Configuración del Sistema
 * @description Maneja la configuración y administración del sistema
 */

const { User, FSOForm } = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

/**
 * Obtener configuración general del sistema
 */
const getSystemConfig = async (req, res) => {
    try {
        // Configuración básica del sistema
        const systemConfig = {
            application: {
                name: 'FSO Automation System',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            },
            features: {
                fileUpload: {
                    enabled: true,
                    maxSize: process.env.MAX_FILE_SIZE || '10MB',
                    allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
                },
                notifications: {
                    enabled: true,
                    emailNotifications: true,
                    systemAlerts: true
                },
                export: {
                    enabled: true,
                    formats: ['CSV', 'Excel', 'JSON'],
                    maxRecords: 10000
                },
                reports: {
                    enabled: true,
                    pdfGeneration: true,
                    scheduledReports: false
                }
            },
            security: {
                jwtExpiration: process.env.JWT_EXPIRATION || '24h',
                passwordPolicy: {
                    minLength: 8,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true
                },
                sessionTimeout: '8h',
                maxLoginAttempts: 5
            },
            database: {
                connectionStatus: 'connected',
                provider: 'MongoDB Atlas',
                backupEnabled: true,
                lastBackup: new Date()
            }
        };

        logger.info('Configuración del sistema consultada:', {
            userId: req.user.id,
            userRole: req.user.role
        });

        res.status(200).json({
            success: true,
            data: systemConfig
        });

    } catch (error) {
        logger.error('Error al obtener configuración del sistema:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al obtener configuración del sistema',
                type: 'CONFIG_ERROR'
            }
        });
    }
};

/**
 * Actualizar configuración del sistema
 */
const updateSystemConfig = async (req, res) => {
    try {
        const { features, security } = req.body;

        // Solo administradores pueden modificar configuración
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'No tienes permisos para modificar la configuración',
                    type: 'PERMISSION_DENIED'
                }
            });
        }

        // Validar configuración de funcionalidades
        if (features) {
            if (features.fileUpload && features.fileUpload.maxSize) {
                // Validar tamaño máximo de archivo
                const maxSizeRegex = /^\d+[MG]B$/;
                if (!maxSizeRegex.test(features.fileUpload.maxSize)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: 'Formato de tamaño máximo inválido (ej: 10MB, 2GB)',
                            type: 'VALIDATION_ERROR'
                        }
                    });
                }
            }

            if (features.export && features.export.maxRecords) {
                if (features.export.maxRecords < 100 || features.export.maxRecords > 100000) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: 'Máximo de registros debe estar entre 100 y 100,000',
                            type: 'VALIDATION_ERROR'
                        }
                    });
                }
            }
        }

        // Validar configuración de seguridad
        if (security) {
            if (security.passwordPolicy) {
                const { minLength, maxLoginAttempts } = security.passwordPolicy;

                if (minLength && (minLength < 6 || minLength > 20)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: 'Longitud mínima de contraseña debe estar entre 6 y 20',
                            type: 'VALIDATION_ERROR'
                        }
                    });
                }

                if (maxLoginAttempts && (maxLoginAttempts < 3 || maxLoginAttempts > 10)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: 'Máximo intentos de login debe estar entre 3 y 10',
                            type: 'VALIDATION_ERROR'
                        }
                    });
                }
            }
        }

        // Aquí normalmente actualizarías la configuración en base de datos
        // Por ahora simulamos la respuesta de éxito

        logger.info('Configuración del sistema actualizada:', {
            userId: req.user.id,
            changes: { features, security },
            timestamp: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Configuración actualizada correctamente',
            data: {
                updatedAt: new Date(),
                updatedBy: req.user.id
            }
        });

    } catch (error) {
        logger.error('Error al actualizar configuración:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            body: req.body
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al actualizar configuración',
                type: 'CONFIG_ERROR'
            }
        });
    }
};

/**
 * Gestión de usuarios del sistema
 */
const getSystemUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, role, status, search } = req.query;

        // Construir filtros
        const filters = {};

        if (role && role !== 'all') {
            filters.role = role;
        }

        if (status && status !== 'all') {
            filters.isActive = status === 'active';
        }

        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        // Obtener usuarios con paginación
        const [users, total] = await Promise.all([
            User.find(filters)
                .select('-password')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean(),
            User.countDocuments(filters)
        ]);

        // Estadísticas adicionales
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    active: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    }
                }
            }
        ]);

        logger.info('Lista de usuarios consultada:', {
            userId: req.user.id,
            filters,
            totalUsers: total,
            page,
            limit
        });

        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                },
                statistics: stats
            }
        });

    } catch (error) {
        logger.error('Error al obtener usuarios:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al obtener lista de usuarios',
                type: 'USERS_ERROR'
            }
        });
    }
};

/**
 * Crear nuevo usuario del sistema
 */
const createSystemUser = async (req, res) => {
    try {
        const { name, email, username, password, role = 'user' } = req.body;

        // Solo administradores pueden crear usuarios
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'No tienes permisos para crear usuarios',
                    type: 'PERMISSION_DENIED'
                }
            });
        }

        // Validaciones básicas
        if (!name || !email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Todos los campos son requeridos',
                    type: 'VALIDATION_ERROR'
                }
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'El email o nombre de usuario ya está en uso',
                    type: 'USER_EXISTS'
                }
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear usuario
        const newUser = new User({
            name,
            email,
            username,
            password: hashedPassword,
            role,
            isActive: true,
            createdBy: req.user.id
        });

        await newUser.save();

        // Remover contraseña de la respuesta
        const userResponse = newUser.toObject();
        delete userResponse.password;

        logger.info('Nuevo usuario creado:', {
            adminId: req.user.id,
            newUserId: newUser._id,
            userEmail: email,
            userRole: role
        });

        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            data: userResponse
        });

    } catch (error) {
        logger.error('Error al crear usuario:', {
            error: error.message,
            stack: error.stack,
            adminId: req.user?.id,
            body: req.body
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al crear usuario',
                type: 'USER_CREATION_ERROR'
            }
        });
    }
};

/**
 * Activar/Desactivar usuario
 */
const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        // Solo administradores pueden modificar usuarios
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'No tienes permisos para modificar usuarios',
                    type: 'PERMISSION_DENIED'
                }
            });
        }

        // No permitir desactivar el propio usuario
        if (userId === req.user.id && !isActive) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'No puedes desactivar tu propia cuenta',
                    type: 'SELF_DEACTIVATION'
                }
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                isActive,
                updatedAt: new Date(),
                updatedBy: req.user.id
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Usuario no encontrado',
                    type: 'USER_NOT_FOUND'
                }
            });
        }

        logger.info('Estado de usuario modificado:', {
            adminId: req.user.id,
            targetUserId: userId,
            newStatus: isActive ? 'activado' : 'desactivado'
        });

        res.status(200).json({
            success: true,
            message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`,
            data: user
        });

    } catch (error) {
        logger.error('Error al modificar estado de usuario:', {
            error: error.message,
            stack: error.stack,
            adminId: req.user?.id,
            targetUserId: req.params.userId
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al modificar estado del usuario',
                type: 'USER_STATUS_ERROR'
            }
        });
    }
};

/**
 * Obtener logs del sistema
 */
const getSystemLogs = async (req, res) => {
    try {
        const {
            level = 'all',
            startDate,
            endDate,
            limit = 100,
            page = 1
        } = req.query;

        // Solo administradores pueden ver logs
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'No tienes permisos para ver los logs del sistema',
                    type: 'PERMISSION_DENIED'
                }
            });
        }

        // Por simplicidad, retornamos logs simulados
        // En un entorno real, leerías desde archivos de log o base de datos
        const logs = [
            {
                timestamp: new Date(),
                level: 'info',
                message: 'Usuario logueado exitosamente',
                userId: req.user.id,
                ip: req.ip
            },
            {
                timestamp: new Date(Date.now() - 60000),
                level: 'warning',
                message: 'Intento de acceso a recurso no autorizado',
                userId: 'unknown',
                ip: '192.168.1.100'
            },
            {
                timestamp: new Date(Date.now() - 120000),
                level: 'error',
                message: 'Error en conexión a base de datos',
                error: 'Connection timeout'
            }
        ];

        logger.info('Logs del sistema consultados:', {
            adminId: req.user.id,
            filters: { level, startDate, endDate },
            limit,
            page
        });

        res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 1,
                    totalLogs: logs.length
                }
            }
        });

    } catch (error) {
        logger.error('Error al obtener logs:', {
            error: error.message,
            stack: error.stack,
            adminId: req.user?.id,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al obtener logs del sistema',
                type: 'LOGS_ERROR'
            }
        });
    }
};

module.exports = {
    getSystemConfig,
    updateSystemConfig,
    getSystemUsers,
    createSystemUser,
    toggleUserStatus,
    getSystemLogs
};
