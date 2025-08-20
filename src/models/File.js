/**
 * @fileoverview Modelo de Archivo
 * @description Define el esquema y modelo para archivos del sistema
 */

const mongoose = require('mongoose');
const { FILE_TYPES, ALLOWED_EXTENSIONS } = require('../constants');

const fileSchema = new mongoose.Schema({
    // Identificación única
    fileId: {
        type: String,
        unique: true,
        required: true,
        default: function () {
            return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    },

    // Información básica del archivo
    nombre: {
        type: String,
        required: [true, 'El nombre del archivo es requerido'],
        trim: true,
        maxlength: [255, 'El nombre del archivo no puede exceder 255 caracteres']
    },
    nombreArchivo: {
        type: String,
        required: [true, 'El nombre del archivo en el sistema es requerido'],
        unique: true
    },
    extension: {
        type: String,
        required: true,
        lowercase: true,
        enum: {
            values: ALLOWED_EXTENSIONS,
            message: 'Extensión de archivo no permitida'
        }
    },
    mimeType: {
        type: String,
        required: true,
        enum: {
            values: Object.values(FILE_TYPES),
            message: 'Tipo MIME no soportado'
        }
    },

    // Metadatos del archivo
    tamaño: {
        type: Number,
        required: true,
        min: [0, 'El tamaño del archivo debe ser positivo']
    },
    hash: {
        type: String,
        required: true,
        unique: true // Para detectar duplicados
    },
    encoding: {
        type: String,
        default: 'binary'
    },

    // Ubicación y almacenamiento
    storage: {
        tipo: {
            type: String,
            enum: ['local', 's3', 'gcs'],
            default: 'local'
        },
        ruta: {
            type: String,
            required: true
        },
        bucket: String, // Para S3/GCS
        url: String,
        urlFirmada: String,
        fechaExpiracionUrl: Date
    },

    // Información de procesamiento
    procesamiento: {
        estado: {
            type: String,
            enum: ['pendiente', 'procesando', 'completado', 'error'],
            default: 'pendiente'
        },
        fechaInicio: Date,
        fechaCompletado: Date,
        tiempoProcesamiento: Number, // en milisegundos
        errores: [String],

        // Específico para PDFs
        pdf: {
            paginas: Number,
            titulo: String,
            autor: String,
            fechaCreacion: Date,
            textoExtraido: String,
            confianzaOCR: Number,
            tablas: [{
                pagina: Number,
                datos: mongoose.Schema.Types.Mixed
            }],
            campos: mongoose.Schema.Types.Mixed,
            firmas: [{
                pagina: Number,
                posicion: {
                    x: Number,
                    y: Number,
                    ancho: Number,
                    alto: Number
                },
                confianza: Number
            }]
        },

        // Específico para imágenes
        imagen: {
            ancho: Number,
            alto: Number,
            formato: String,
            colorProfile: String,
            thumbnailGenerado: {
                type: Boolean,
                default: false
            },
            thumbnailUrl: String
        }
    },

    // Relaciones
    relaciones: {
        formularioFSO: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FSOForm'
        },
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reporteGenerado: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'File' // Auto-referencia para PDFs generados
        }
    },

    // Configuración de acceso y seguridad
    acceso: {
        publico: {
            type: Boolean,
            default: false
        },
        permisos: [{
            usuario: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            nivel: {
                type: String,
                enum: ['lectura', 'escritura', 'eliminacion'],
                default: 'lectura'
            }
        }],
        fechaExpiracion: Date,
        limitarDescargas: {
            activo: {
                type: Boolean,
                default: false
            },
            maximo: Number,
            actuales: {
                type: Number,
                default: 0
            }
        }
    },

    // Metadatos adicionales
    metadatos: {
        descripcion: {
            type: String,
            maxlength: [500, 'La descripción no puede exceder 500 caracteres']
        },
        etiquetas: [String],
        categoria: {
            type: String,
            enum: ['formulario', 'reporte', 'imagen', 'documento', 'evidencia'],
            default: 'documento'
        },
        origen: {
            type: String,
            enum: ['upload', 'generado', 'importado'],
            default: 'upload'
        },
        version: {
            type: Number,
            default: 1
        }
    },

    // Información del sistema
    sistema: {
        subidoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        ipOrigen: String,
        userAgent: String,
        fechaUltimoAcceso: Date,
        contadorDescargas: {
            type: Number,
            default: 0
        },
        contadorVisualizaciones: {
            type: Number,
            default: 0
        }
    },

    // Configuración de retención
    retencion: {
        fechaEliminacion: Date,
        motivo: String,
        autorizado: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        eliminado: {
            type: Boolean,
            default: false
        },
        fechaEliminacionFisica: Date
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.__v;
            // No devolver información sensible
            if (ret.storage) {
                delete ret.storage.ruta;
            }
            return ret;
        }
    }
});

// Índices para optimizar consultas
fileSchema.index({ fileId: 1 }, { unique: true });
fileSchema.index({ nombreArchivo: 1 }, { unique: true });
fileSchema.index({ hash: 1 }, { unique: true });
fileSchema.index({ 'relaciones.formularioFSO': 1 });
fileSchema.index({ 'relaciones.usuario': 1 });
fileSchema.index({ 'sistema.subidoPor': 1 });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ 'metadatos.categoria': 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ 'procesamiento.estado': 1 });
fileSchema.index({ 'retencion.eliminado': 1 });

// Índice compuesto para búsquedas
fileSchema.index({
    'metadatos.categoria': 1,
    'procesamiento.estado': 1,
    createdAt: -1
});

// Virtual para obtener URL de descarga
fileSchema.virtual('urlDescarga').get(function () {
    if (this.storage.url) {
        return this.storage.url;
    }
    return `/api/v1/files/${this.fileId}/download`;
});

// Virtual para verificar si el archivo está expirado
fileSchema.virtual('estaExpirado').get(function () {
    if (!this.acceso.fechaExpiracion) return false;
    return new Date() > this.acceso.fechaExpiracion;
});

// Virtual para obtener tamaño legible
fileSchema.virtual('tamañoLegible').get(function () {
    const bytes = this.tamaño;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Middleware pre-save
fileSchema.pre('save', function (next) {
    // Extraer extensión del nombre si no está definida
    if (!this.extension && this.nombre) {
        const ext = this.nombre.split('.').pop().toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            this.extension = ext;
        }
    }

    // Actualizar fecha de último acceso si es una visualización/descarga
    if (this.isModified('sistema.contadorDescargas') || this.isModified('sistema.contadorVisualizaciones')) {
        this.sistema.fechaUltimoAcceso = new Date();
    }

    next();
});

// Método para incrementar descargas
fileSchema.methods.incrementarDescargas = function () {
    this.sistema.contadorDescargas += 1;
    this.sistema.fechaUltimoAcceso = new Date();

    // Verificar límite de descargas si está activo
    if (this.acceso.limitarDescargas.activo) {
        this.acceso.limitarDescargas.actuales += 1;
    }

    return this.save();
};

// Método para incrementar visualizaciones
fileSchema.methods.incrementarVisualizaciones = function () {
    this.sistema.contadorVisualizaciones += 1;
    this.sistema.fechaUltimoAcceso = new Date();
    return this.save();
};

// Método para verificar permisos de acceso
fileSchema.methods.tienePermiso = function (usuarioId, nivel = 'lectura') {
    // Si es público, permitir lectura
    if (this.acceso.publico && nivel === 'lectura') {
        return true;
    }

    // Si es el propietario, permitir todo
    if (this.sistema.subidoPor.toString() === usuarioId.toString()) {
        return true;
    }

    // Verificar permisos específicos
    const permiso = this.acceso.permisos.find(p =>
        p.usuario.toString() === usuarioId.toString()
    );

    if (!permiso) return false;

    const nivelesPermiso = ['lectura', 'escritura', 'eliminacion'];
    const nivelRequerido = nivelesPermiso.indexOf(nivel);
    const nivelUsuario = nivelesPermiso.indexOf(permiso.nivel);

    return nivelUsuario >= nivelRequerido;
};

// Método para marcar como eliminado (soft delete)
fileSchema.methods.eliminar = function (motivo, usuarioId) {
    this.retencion.eliminado = true;
    this.retencion.fechaEliminacion = new Date();
    this.retencion.motivo = motivo;
    this.retencion.autorizado = usuarioId;

    // Programar eliminación física en 30 días
    const fechaEliminacionFisica = new Date();
    fechaEliminacionFisica.setDate(fechaEliminacionFisica.getDate() + 30);
    this.retencion.fechaEliminacionFisica = fechaEliminacionFisica;

    return this.save();
};

// Método estático para buscar archivos no eliminados
fileSchema.statics.findActive = function (filter = {}) {
    return this.find({
        ...filter,
        'retencion.eliminado': { $ne: true }
    });
};

// Método estático para buscar archivos por formulario
fileSchema.statics.findByFormulario = function (formularioId) {
    return this.findActive({
        'relaciones.formularioFSO': formularioId
    });
};

// Método estático para buscar archivos duplicados por hash
fileSchema.statics.findDuplicates = function (hash, excludeId = null) {
    const query = { hash };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return this.findActive(query);
};

// Método estático para obtener estadísticas de archivos
fileSchema.statics.obtenerEstadisticas = async function () {
    const pipeline = [
        { $match: { 'retencion.eliminado': { $ne: true } } },
        {
            $group: {
                _id: null,
                totalArchivos: { $sum: 1 },
                tamañoTotal: { $sum: '$tamaño' },
                porTipo: {
                    $push: {
                        tipo: '$mimeType',
                        tamaño: '$tamaño'
                    }
                }
            }
        }
    ];

    const resultado = await this.aggregate(pipeline);
    return resultado[0] || {
        totalArchivos: 0,
        tamañoTotal: 0,
        porTipo: []
    };
};

const File = mongoose.model('File', fileSchema);

module.exports = File;
