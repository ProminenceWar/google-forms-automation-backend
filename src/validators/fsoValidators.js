/**
 * @fileoverview Validadores para formularios FSO
 * @description Esquemas de validación para endpoints de formularios FSO
 */

const Joi = require('joi');

const fsoValidators = {
    // Validador para crear formulario FSO
    create: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Debe proporcionar un email válido',
                'any.required': 'El email es requerido'
            }),
        numeroOrden: Joi.string()
            .trim()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.min': 'El número de orden debe tener al menos 3 caracteres',
                'string.max': 'El número de orden no puede exceder 50 caracteres',
                'any.required': 'El número de orden es requerido'
            }),
        tipoFSO: Joi.string()
            .valid('Instalación Fibra', 'Reparación Fibra', 'Instalación Cobre', 'Reparación Cobre', 'Inspección')
            .required()
            .messages({
                'any.only': 'Tipo de FSO inválido',
                'any.required': 'El tipo de FSO es requerido'
            }),
        companiaInspeccion: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'El nombre de la compañía debe tener al menos 2 caracteres',
                'string.max': 'El nombre de la compañía no puede exceder 100 caracteres',
                'any.required': 'La compañía de inspección es requerida'
            }),
        nombreTecnico: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'El nombre del técnico debe tener al menos 2 caracteres',
                'string.max': 'El nombre del técnico no puede exceder 100 caracteres',
                'any.required': 'El nombre del técnico es requerido'
            }),

        // Campos de inspección técnica
        instalacionDireccionCorrecta: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo instalacionDireccionCorrecta es requerido'
            }),
        combaFTB: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo combaFTB es requerido'
            }),
        colocacionGripCorrecta: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo colocacionGripCorrecta es requerido'
            }),
        alturaDropCorrecta: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo alturaDropCorrecta es requerido'
            }),
        puntoApoyoAdecuado: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo puntoApoyoAdecuado es requerido'
            }),
        dropLibreEmpalme: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo dropLibreEmpalme es requerido'
            }),
        colocacionGanchosCorrecta: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo colocacionGanchosCorrecta es requerido'
            }),
        recorridoDropExteriorAdecuado: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo recorridoDropExteriorAdecuado es requerido'
            }),
        colocacionTestTerminalCorrecta: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo colocacionTestTerminalCorrecta es requerido'
            }),
        jackSuperficieCorrecto: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo jackSuperficieCorrecto es requerido'
            }),
        routerUbicadoCorrectamente: Joi.boolean()
            .required()
            .messages({
                'any.required': 'El campo routerUbicadoCorrectamente es requerido'
            }),

        // Mediciones técnicas
        metrosDrop: Joi.string()
            .pattern(new RegExp('^\\d+(\\.\\d+)?$'))
            .required()
            .messages({
                'string.pattern.base': 'Los metros de drop deben ser un número positivo',
                'any.required': 'Los metros de drop son requeridos'
            }),
        potenciaCorrecta: Joi.string()
            .pattern(new RegExp('^-?\\d+(\\.\\d+)?\\s*(dBm|dbm|DBM)$'))
            .required()
            .messages({
                'string.pattern.base': 'La potencia debe incluir la unidad dBm (ej: -15 dBm)',
                'any.required': 'La potencia es requerida'
            }),

        // Información del cliente
        nombreCliente: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'El nombre del cliente debe tener al menos 2 caracteres',
                'string.max': 'El nombre del cliente no puede exceder 100 caracteres',
                'any.required': 'El nombre del cliente es requerido'
            }),
        telefonoCliente: Joi.alternatives()
            .try(
                Joi.number().integer().positive(),
                Joi.string().pattern(new RegExp('^\\+?[\\d\\s\\-\\(\\)]+$'))
            )
            .required()
            .messages({
                'alternatives.match': 'El teléfono del cliente debe ser un número válido',
                'any.required': 'El teléfono del cliente es requerido'
            }),
        puntuacionCliente: Joi.string()
            .valid('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
            .required()
            .messages({
                'any.only': 'La puntuación del cliente debe ser un número del 1 al 10',
                'any.required': 'La puntuación del cliente es requerida'
            }),

        // Campos opcionales
        comentariosCaso: Joi.string()
            .trim()
            .max(1000)
            .optional()
            .allow('')
            .messages({
                'string.max': 'Los comentarios no pueden exceder 1000 caracteres'
            }),

        ubicacion: Joi.object({
            latitude: Joi.number()
                .min(-90)
                .max(90)
                .optional()
                .messages({
                    'number.min': 'La latitud debe estar entre -90 y 90',
                    'number.max': 'La latitud debe estar entre -90 y 90'
                }),
            longitude: Joi.number()
                .min(-180)
                .max(180)
                .optional()
                .messages({
                    'number.min': 'La longitud debe estar entre -180 y 180',
                    'number.max': 'La longitud debe estar entre -180 y 180'
                }),
            direccion: Joi.string()
                .trim()
                .max(500)
                .optional()
                .allow('')
                .messages({
                    'string.max': 'La dirección no puede exceder 500 caracteres'
                })
        }).optional()
    }),

    // Validador para actualizar formulario FSO
    update: Joi.object({
        comentariosCaso: Joi.string()
            .trim()
            .max(1000)
            .optional()
            .allow('')
            .messages({
                'string.max': 'Los comentarios no pueden exceder 1000 caracteres'
            }),
        estado: Joi.string()
            .valid('pendiente', 'completado', 'revisado', 'archivado')
            .optional()
            .messages({
                'any.only': 'Estado inválido'
            }),
        puntuacionCliente: Joi.string()
            .valid('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
            .optional()
            .messages({
                'any.only': 'La puntuación del cliente debe ser un número del 1 al 10'
            }),
        ubicacion: Joi.object({
            latitude: Joi.number()
                .min(-90)
                .max(90)
                .optional()
                .messages({
                    'number.min': 'La latitud debe estar entre -90 y 90',
                    'number.max': 'La latitud debe estar entre -90 y 90'
                }),
            longitude: Joi.number()
                .min(-180)
                .max(180)
                .optional()
                .messages({
                    'number.min': 'La longitud debe estar entre -180 y 180',
                    'number.max': 'La longitud debe estar entre -180 y 180'
                }),
            direccion: Joi.string()
                .trim()
                .max(500)
                .optional()
                .allow('')
                .messages({
                    'string.max': 'La dirección no puede exceder 500 caracteres'
                })
        }).optional()
    }).min(1), // Al menos un campo debe ser actualizado

    // Validador para parámetros de consulta
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
        estado: Joi.string()
            .valid('pendiente', 'completado', 'revisado', 'archivado')
            .optional()
            .messages({
                'any.only': 'Estado inválido'
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
        tecnico: Joi.string()
            .trim()
            .optional(),
        companiaInspeccion: Joi.string()
            .trim()
            .optional(),
        search: Joi.string()
            .trim()
            .optional()
    }),

    // Validador para ID de formulario
    formId: Joi.object({
        id: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$|^fso_\\d+_[a-zA-Z0-9]+$'))
            .required()
            .messages({
                'string.pattern.base': 'ID de formulario inválido',
                'any.required': 'El ID del formulario es requerido'
            })
    })
};

module.exports = fsoValidators;
