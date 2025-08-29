/**
 * @fileoverview Modelo de Formulario FSO
 * @description Define el esquema y modelo para formularios FSO
 */

const mongoose = require('mongoose');
const { FSO_STATES, FSO_TYPES } = require('../constants');

const fsoFormSchema = new mongoose.Schema({
    // Identificación única
    formId: {
        type: String,
        unique: true,
        required: true,
        default: function () {
            return `fso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    },

    // Información básica del formulario
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    numeroOrden: {
        type: String,
        required: [true, 'El número de orden es requerido'],
        unique: true,
        trim: true,
        uppercase: true
    },
    tipoFSO: {
        type: String,
        required: [true, 'El tipo de FSO es requerido'],
        enum: {
            values: Object.values(FSO_TYPES),
            message: 'Tipo de FSO inválido'
        }
    },

    // Información del técnico y compañía
    companiaInspeccion: {
        type: String,
        required: [true, 'La compañía de inspección es requerida'],
        trim: true,
        maxlength: [100, 'El nombre de la compañía no puede exceder 100 caracteres']
    },
    nombreTecnico: {
        type: String,
        required: [true, 'El nombre del técnico es requerido'],
        trim: true,
        maxlength: [100, 'El nombre del técnico no puede exceder 100 caracteres']
    },

    // Campos de inspección técnica (boolean) - estructura del frontend
    itemsInspeccion: {
        instalacionDireccionCorrecta: {
            type: Boolean,
            required: true
        },
        combaFTB: {
            type: Boolean,
            required: true
        },
        colocacionGripCorrecta: {
            type: Boolean,
            required: true
        },
        alturaDropCorrecta: {
            type: Boolean,
            required: true
        },
        puntoApoyoAdecuado: {
            type: Boolean,
            required: true
        },
        dropLibreEmpalme: {
            type: Boolean,
            required: true
        },
        colocacionGanchosCorrecta: {
            type: Boolean,
            required: true
        },
        recorridoDropExteriorAdecuado: {
            type: Boolean,
            required: true
        },
        colocacionTestTerminalCorrecta: {
            type: Boolean,
            required: true
        },
        jackSuperficieCorrecto: {
            type: Boolean,
            required: true
        },
        potenciaCorrecta: {
            type: Boolean,
            required: true
        },
        routerUbicadoCorrectamente: {
            type: Boolean,
            required: true
        }
    },

    // Mediciones técnicas - estructura del frontend
    medicionesTecnicas: {
        metrosDrop: {
            type: String,
            required: [true, 'Los metros de drop son requeridos'],
            trim: true
        },
        potencia: {
            type: String,
            required: [true, 'La potencia es requerida'],
            trim: true
        }
    },

    // Información del cliente - estructura del frontend
    datosCliente: {
        nombreCliente: {
            type: String,
            required: [true, 'El nombre del cliente es requerido'],
            trim: true,
            maxlength: [100, 'El nombre del cliente no puede exceder 100 caracteres']
        },
        telefonoCliente: {
            type: String,
            required: [true, 'El teléfono del cliente es requerido'],
            trim: true
        },
        puntuacionCliente: {
            type: Number,
            required: [true, 'La puntuación del cliente es requerida'],
            min: [1, 'La puntuación debe ser mínimo 1'],
            max: [10, 'La puntuación debe ser máximo 10']
        }
    },

    // Comentarios y observaciones
    comentariosCaso: {
        type: String,
        required: [true, 'Los comentarios del caso son requeridos'],
        trim: true,
        maxlength: [1000, 'Los comentarios no pueden exceder 1000 caracteres']
    },

    // Ubicación geográfica - opcional
    ubicacion: {
        type: mongoose.Schema.Types.Mixed,
        default: undefined
    },

    // Estado y metadatos del formulario
    estado: {
        type: String,
        enum: {
            values: Object.values(FSO_STATES),
            message: 'Estado inválido'
        },
        default: FSO_STATES.COMPLETED
    },

    // Fechas opcionales - compatibilidad con frontend
    fechaCreacion: {
        type: Date,
        default: undefined
    },

    fechaActualizacion: {
        type: Date,
        default: undefined
    },

    // Puntuación calculada - opcional
    puntuacionCalculada: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },

    // Archivos adjuntos
    archivosAdjuntos: [{
        archivoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'File'
        },
        nombre: String,
        tipo: String,
        fechaSubida: {
            type: Date,
            default: Date.now
        }
    }],

    // Historial de cambios
    historial: [{
        accion: {
            type: String,
            required: true,
            enum: ['creado', 'actualizado', 'completado', 'revisado', 'archivado', 'eliminado']
        },
        fecha: {
            type: Date,
            default: Date.now
        },
        usuario: {
            type: String,
            required: true
        },
        usuarioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cambios: [{
            campo: String,
            valorAnterior: mongoose.Schema.Types.Mixed,
            valorNuevo: mongoose.Schema.Types.Mixed
        }],
        comentario: String
    }],

    // Información de procesamiento
    procesamiento: {
        fechaProcesamiento: Date,
        tiempoProcesamiento: Number, // en milisegundos
        reportePdfGenerado: {
            type: Boolean,
            default: false
        },
        reportePdfUrl: String,
        notificacionEnviada: {
            type: Boolean,
            default: false
        },
        validacionAutomatica: {
            realizada: {
                type: Boolean,
                default: false
            },
            resultado: String,
            errores: [String]
        }
    },

    // Metadatos del sistema
    metadata: {
        creadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        actualizadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        ipOrigen: String,
        userAgent: String,
        version: {
            type: Number,
            default: 1
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Índices para optimizar consultas
fsoFormSchema.index({ formId: 1 }, { unique: true });
fsoFormSchema.index({ numeroOrden: 1 }, { unique: true });
fsoFormSchema.index({ email: 1 });
fsoFormSchema.index({ estado: 1 });
fsoFormSchema.index({ tipoFSO: 1 });
fsoFormSchema.index({ companiaInspeccion: 1 });
fsoFormSchema.index({ nombreTecnico: 1 });
fsoFormSchema.index({ createdAt: -1 });
fsoFormSchema.index({ updatedAt: -1 });
fsoFormSchema.index({ 'datosCliente.nombreCliente': 1 });
fsoFormSchema.index({ 'puntuacionCalculada': -1 });

// Índice compuesto para búsquedas complejas
fsoFormSchema.index({
    estado: 1,
    companiaInspeccion: 1,
    createdAt: -1
});

// Middleware pre-save para calcular puntuaciones
fsoFormSchema.pre('save', function (next) {
    if (this.isModified('itemsInspeccion') || this.isNew) {
        this.calcularPuntuaciones();
    }
    next();
});

// Método para calcular puntuaciones automáticamente
fsoFormSchema.methods.calcularPuntuaciones = function () {
    // Usar la nueva estructura itemsInspeccion
    const criterios = this.itemsInspeccion;
    if (!criterios) return;

    const totalCriterios = Object.keys(criterios).length;
    const criteriosAprobados = Object.values(criterios).filter(valor => valor === true).length;

    // Calcular puntuación considerando también la puntuación del cliente
    const puntuacionCliente = this.datosCliente?.puntuacionCliente || 0;
    const puntuacionTecnica = totalCriterios > 0 ? (criteriosAprobados / totalCriterios) * 10 : 0;

    // Promedio ponderado: 70% técnica, 30% cliente
    this.puntuacionCalculada = Number(
        ((puntuacionTecnica * 0.7) + (puntuacionCliente * 0.3)).toFixed(2)
    );
};

// Método para agregar entrada al historial
fsoFormSchema.methods.agregarHistorial = function (accion, usuario, usuarioId = null, cambios = [], comentario = '') {
    this.historial.push({
        accion,
        usuario,
        usuarioId,
        cambios,
        comentario,
        fecha: new Date()
    });
};

// Método para agregar archivo adjunto
fsoFormSchema.methods.agregarArchivo = function (archivoId, nombre, tipo) {
    this.archivosAdjuntos.push({
        archivoId,
        nombre,
        tipo,
        fechaSubida: new Date()
    });
};

// Virtual para obtener edad del formulario
fsoFormSchema.virtual('edad').get(function () {
    return Date.now() - this.createdAt.getTime();
});

// Virtual para verificar si está vencido (más de 30 días)
fsoFormSchema.virtual('estaVencido').get(function () {
    const diasVencimiento = 30;
    const tiempoVencimiento = diasVencimiento * 24 * 60 * 60 * 1000;
    return this.edad > tiempoVencimiento;
});

// Método estático para buscar por filtros
fsoFormSchema.statics.buscarPorFiltros = function (filtros = {}) {
    const query = {};

    if (filtros.estado) query.estado = filtros.estado;
    if (filtros.tipoFSO) query.tipoFSO = filtros.tipoFSO;
    if (filtros.companiaInspeccion) {
        query.companiaInspeccion = new RegExp(filtros.companiaInspeccion, 'i');
    }
    if (filtros.nombreTecnico) {
        query.nombreTecnico = new RegExp(filtros.nombreTecnico, 'i');
    }
    if (filtros.fechaInicio && filtros.fechaFin) {
        query.createdAt = {
            $gte: new Date(filtros.fechaInicio),
            $lte: new Date(filtros.fechaFin)
        };
    }
    if (filtros.search) {
        query.$or = [
            { numeroOrden: new RegExp(filtros.search, 'i') },
            { 'datosCliente.nombreCliente': new RegExp(filtros.search, 'i') }
        ];
    }

    return this.find(query);
};

// Método estático para obtener estadísticas
fsoFormSchema.statics.obtenerEstadisticas = async function (filtros = {}) {
    const pipeline = [
        { $match: filtros },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                completados: {
                    $sum: { $cond: [{ $eq: ['$estado', FSO_STATES.COMPLETED] }, 1, 0] }
                },
                pendientes: {
                    $sum: { $cond: [{ $eq: ['$estado', FSO_STATES.PENDING] }, 1, 0] }
                },
                revisados: {
                    $sum: { $cond: [{ $eq: ['$estado', FSO_STATES.REVIEWED] }, 1, 0] }
                },
                puntuacionPromedio: { $avg: '$puntuacionCalculada' },
                porcentajeAprobacionPromedio: { $avg: '$puntuacionCalculada' }
            }
        }
    ];

    const resultado = await this.aggregate(pipeline);
    return resultado[0] || {
        total: 0,
        completados: 0,
        pendientes: 0,
        revisados: 0,
        puntuacionPromedio: 0,
        porcentajeAprobacionPromedio: 0
    };
};

// Método de instancia para convertir a datos de formulario
fsoFormSchema.methods.toFormData = function () {
    return {
        name: this.datosCliente?.nombreCliente,
        email: this.email,
        phone: this.datosCliente?.telefonoCliente,
        orderNumber: this.numeroOrden,
        serviceType: this.tipoFSO,
        technician: this.nombreTecnico,
        company: this.companiaInspeccion,
        address: this.ubicacion?.direccion,
        comments: this.comentariosCaso,
        status: this.estado
    };
};

const FSOForm = mongoose.model('FSOForm', fsoFormSchema);

module.exports = FSOForm;
