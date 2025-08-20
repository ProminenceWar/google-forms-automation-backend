/**
 * @fileoverview Validadores para archivos
 * @description Esquemas de validación para endpoints de archivos
 */

const Joi = require('joi');

const fileValidators = {
    // Validador para upload de archivos
    upload: Joi.object({
        tipo: Joi.string()
            .valid('pdf', 'image', 'document')
            .optional()
            .messages({
                'any.only': 'Tipo de archivo inválido'
            }),
        descripcion: Joi.string()
            .trim()
            .max(500)
            .optional()
            .allow('')
            .messages({
                'string.max': 'La descripción no puede exceder 500 caracteres'
            }),
        formularioId: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$|^fso_\\d+_[a-zA-Z0-9]+$'))
            .optional()
            .messages({
                'string.pattern.base': 'ID de formulario inválido'
            }),
        categoria: Joi.string()
            .valid('formulario', 'reporte', 'imagen', 'documento', 'evidencia')
            .default('documento')
            .messages({
                'any.only': 'Categoría de archivo inválida'
            }),
        etiquetas: Joi.array()
            .items(Joi.string().trim().max(50))
            .max(10)
            .optional()
            .messages({
                'array.max': 'No puede haber más de 10 etiquetas',
                'string.max': 'Cada etiqueta no puede exceder 50 caracteres'
            }),
        publico: Joi.boolean()
            .default(false)
            .optional()
    }),

    // Validador para parámetros de descarga
    download: Joi.object({
        inline: Joi.boolean()
            .optional()
            .default(false)
    }),

    // Validador para procesamiento de PDF
    processPdf: Joi.object({
        archivoId: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$|^file_\\d+_[a-zA-Z0-9]+$'))
            .required()
            .messages({
                'string.pattern.base': 'ID de archivo inválido',
                'any.required': 'El ID del archivo es requerido'
            }),
        tipoFormulario: Joi.string()
            .valid('fso', 'inspeccion', 'reporte')
            .default('fso')
            .messages({
                'any.only': 'Tipo de formulario inválido'
            }),
        configuracionExtraccion: Joi.object({
            extraerTexto: Joi.boolean().default(true),
            extraerTablas: Joi.boolean().default(true),
            extraerCampos: Joi.boolean().default(true),
            reconocerFirmas: Joi.boolean().default(false)
        }).optional()
    }),

    // Validador para generación de reporte PDF
    generateReport: Joi.object({
        formularioId: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$|^fso_\\d+_[a-zA-Z0-9]+$'))
            .required()
            .messages({
                'string.pattern.base': 'ID de formulario inválido',
                'any.required': 'El ID del formulario es requerido'
            }),
        tipoReporte: Joi.string()
            .valid('completo', 'resumen', 'certificacion')
            .default('completo')
            .messages({
                'any.only': 'Tipo de reporte inválido'
            }),
        incluirImagenes: Joi.boolean()
            .default(true),
        incluirFirmas: Joi.boolean()
            .default(false),
        plantilla: Joi.string()
            .valid('standard', 'detallada', 'certificacion')
            .default('standard')
            .messages({
                'any.only': 'Plantilla de reporte inválida'
            })
    }),

    // Validador para ID de archivo
    fileId: Joi.object({
        id: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$|^file_\\d+_[a-zA-Z0-9]+$'))
            .required()
            .messages({
                'string.pattern.base': 'ID de archivo inválido',
                'any.required': 'El ID del archivo es requerido'
            })
    }),

    // Validador para parámetros de consulta de archivos
    queryParams: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.min': 'La página debe ser un número positivo'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.min': 'El límite debe ser un número positivo',
                'number.max': 'El límite no puede exceder 100'
            }),
        tipo: Joi.string()
            .valid('pdf', 'image', 'document')
            .optional()
            .messages({
                'any.only': 'Tipo de archivo inválido'
            }),
        categoria: Joi.string()
            .valid('formulario', 'reporte', 'imagen', 'documento', 'evidencia')
            .optional()
            .messages({
                'any.only': 'Categoría de archivo inválida'
            }),
        estado: Joi.string()
            .valid('pendiente', 'procesando', 'completado', 'error')
            .optional()
            .messages({
                'any.only': 'Estado de procesamiento inválido'
            }),
        fechaInicio: Joi.date()
            .iso()
            .optional()
            .messages({
                'date.format': 'La fecha de inicio debe estar en formato ISO 8601'
            }),
        fechaFin: Joi.date()
            .iso()
            .min(Joi.ref('fechaInicio'))
            .optional()
            .messages({
                'date.format': 'La fecha de fin debe estar en formato ISO 8601',
                'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio'
            }),
        formularioId: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$|^fso_\\d+_[a-zA-Z0-9]+$'))
            .optional()
            .messages({
                'string.pattern.base': 'ID de formulario inválido'
            }),
        search: Joi.string()
            .trim()
            .optional()
    }),

    // Validador para actualización de metadatos de archivo
    updateMetadata: Joi.object({
        descripcion: Joi.string()
            .trim()
            .max(500)
            .optional()
            .allow('')
            .messages({
                'string.max': 'La descripción no puede exceder 500 caracteres'
            }),
        etiquetas: Joi.array()
            .items(Joi.string().trim().max(50))
            .max(10)
            .optional()
            .messages({
                'array.max': 'No puede haber más de 10 etiquetas',
                'string.max': 'Cada etiqueta no puede exceder 50 caracteres'
            }),
        categoria: Joi.string()
            .valid('formulario', 'reporte', 'imagen', 'documento', 'evidencia')
            .optional()
            .messages({
                'any.only': 'Categoría de archivo inválida'
            }),
        publico: Joi.boolean()
            .optional()
    }).min(1), // Al menos un campo debe ser actualizado

    // Validador para configuración de permisos de archivo
    permissions: Joi.object({
        permisos: Joi.array()
            .items(
                Joi.object({
                    usuario: Joi.string()
                        .pattern(new RegExp('^[a-fA-F0-9]{24}$'))
                        .required()
                        .messages({
                            'string.pattern.base': 'ID de usuario inválido',
                            'any.required': 'El ID del usuario es requerido'
                        }),
                    nivel: Joi.string()
                        .valid('lectura', 'escritura', 'eliminacion')
                        .default('lectura')
                        .messages({
                            'any.only': 'Nivel de permiso inválido'
                        })
                })
            )
            .required()
            .messages({
                'any.required': 'Los permisos son requeridos'
            }),
        fechaExpiracion: Joi.date()
            .iso()
            .min('now')
            .optional()
            .messages({
                'date.format': 'La fecha de expiración debe estar en formato ISO 8601',
                'date.min': 'La fecha de expiración debe ser futura'
            }),
        limitarDescargas: Joi.object({
            activo: Joi.boolean().default(false),
            maximo: Joi.number()
                .integer()
                .min(1)
                .when('activo', {
                    is: true,
                    then: Joi.required(),
                    otherwise: Joi.optional()
                })
                .messages({
                    'number.min': 'El máximo de descargas debe ser positivo',
                    'any.required': 'El máximo de descargas es requerido cuando el límite está activo'
                })
        }).optional()
    })
};

module.exports = fileValidators;
