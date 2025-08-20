/**
 * @fileoverview Middleware de validación
 * @description Middleware para validar datos de entrada usando Joi
 */

const Joi = require('joi');
const httpCodes = require('../constants/httpCodes');
const errorCodes = require('../constants/errorCodes');

/**
 * Middleware de validación genérico
 * @param {Object} schema - Esquema de validación Joi
 * @param {string} source - Fuente de datos ('body', 'query', 'params')
 * @returns {Function} Middleware de Express
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];

        const { error, value } = schema.validate(data, {
            abortEarly: false, // Obtener todos los errores
            allowUnknown: false, // No permitir campos desconocidos
            stripUnknown: true // Remover campos desconocidos
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(httpCodes.UNPROCESSABLE_ENTITY).json({
                success: false,
                message: 'Error de validación de datos',
                error: {
                    code: errorCodes.VALIDATION.REQUIRED_FIELD,
                    details: errorDetails
                },
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
        }

        // Reemplazar los datos originales con los datos validados y sanitizados
        req[source] = value;
        next();
    };
};

/**
 * Middleware para validar el cuerpo de la petición
 * @param {Object} schema - Esquema de validación Joi
 * @returns {Function} Middleware de Express
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Middleware para validar los parámetros de consulta
 * @param {Object} schema - Esquema de validación Joi
 * @returns {Function} Middleware de Express
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Middleware para validar los parámetros de ruta
 * @param {Object} schema - Esquema de validación Joi
 * @returns {Function} Middleware de Express
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Middleware para validar múltiples fuentes de datos
 * @param {Object} schemas - Objeto con esquemas para diferentes fuentes
 * @returns {Function} Middleware de Express
 */
const validateMultiple = (schemas) => {
    return (req, res, next) => {
        const errors = [];

        // Validar cada fuente de datos especificada
        for (const [source, schema] of Object.entries(schemas)) {
            if (req[source] !== undefined) {
                const { error, value } = schema.validate(req[source], {
                    abortEarly: false,
                    allowUnknown: false,
                    stripUnknown: true
                });

                if (error) {
                    const sourceErrors = error.details.map(detail => ({
                        source,
                        field: detail.path.join('.'),
                        message: detail.message,
                        value: detail.context?.value
                    }));
                    errors.push(...sourceErrors);
                } else {
                    req[source] = value;
                }
            }
        }

        if (errors.length > 0) {
            return res.status(httpCodes.UNPROCESSABLE_ENTITY).json({
                success: false,
                message: 'Error de validación de datos',
                error: {
                    code: errorCodes.VALIDATION.REQUIRED_FIELD,
                    details: errors
                },
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
        }

        next();
    };
};

/**
 * Middleware para validar archivos subidos
 * @param {Object} options - Opciones de validación
 * @returns {Function} Middleware de Express
 */
const validateFile = (options = {}) => {
    const {
        required = true,
        maxSize = 10 * 1024 * 1024, // 10MB por defecto
        allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
        fieldName = 'file'
    } = options;

    return (req, res, next) => {
        const file = req.file || req.files?.[fieldName];

        // Verificar si el archivo es requerido
        if (required && !file) {
            return res.status(httpCodes.BAD_REQUEST).json({
                success: false,
                message: 'Archivo requerido',
                error: {
                    code: errorCodes.FILE.NOT_FOUND,
                    details: `El campo '${fieldName}' es requerido`
                },
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
        }

        if (file) {
            // Verificar tamaño del archivo
            if (file.size > maxSize) {
                return res.status(httpCodes.PAYLOAD_TOO_LARGE).json({
                    success: false,
                    message: 'Archivo demasiado grande',
                    error: {
                        code: errorCodes.FILE.TOO_LARGE,
                        details: `El archivo excede el tamaño máximo permitido de ${maxSize} bytes`
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id
                });
            }

            // Verificar tipo de archivo
            if (!allowedTypes.includes(file.mimetype)) {
                return res.status(httpCodes.UNSUPPORTED_MEDIA_TYPE).json({
                    success: false,
                    message: 'Tipo de archivo no soportado',
                    error: {
                        code: errorCodes.FILE.INVALID_TYPE,
                        details: `Tipos permitidos: ${allowedTypes.join(', ')}`
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id
                });
            }
        }

        next();
    };
};

/**
 * Middleware para validar IDs de MongoDB
 * @param {string} paramName - Nombre del parámetro que contiene el ID
 * @returns {Function} Middleware de Express
 */
const validateObjectId = (paramName = 'id') => {
    const schema = Joi.object({
        [paramName]: Joi.string()
            .pattern(new RegExp('^[a-fA-F0-9]{24}$'))
            .required()
            .messages({
                'string.pattern.base': 'ID inválido',
                'any.required': 'ID requerido'
            })
    });

    return validateParams(schema);
};

/**
 * Middleware para validar paginación
 * @returns {Function} Middleware de Express
 */
const validatePagination = () => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().optional(),
        order: Joi.string().valid('asc', 'desc').default('desc')
    }).unknown(true); // Permitir otros parámetros de consulta

    return validateQuery(schema);
};

/**
 * Middleware para validar fechas
 * @returns {Function} Middleware de Express
 */
const validateDateRange = () => {
    const schema = Joi.object({
        fechaInicio: Joi.date().iso().optional(),
        fechaFin: Joi.date().iso().min(Joi.ref('fechaInicio')).optional()
    }).unknown(true);

    return validateQuery(schema);
};

/**
 * Middleware para sanitizar HTML en strings
 * @param {Array} fields - Campos a sanitizar
 * @returns {Function} Middleware de Express
 */
const sanitizeHtml = (fields = []) => {
    return (req, res, next) => {
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return str;

            // Remover tags HTML básicos
            return str
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .trim();
        };

        const sanitizeObject = (obj, fieldsToSanitize) => {
            for (const field of fieldsToSanitize) {
                if (obj[field] !== undefined) {
                    if (typeof obj[field] === 'string') {
                        obj[field] = sanitizeString(obj[field]);
                    } else if (typeof obj[field] === 'object' && obj[field] !== null) {
                        for (const key in obj[field]) {
                            if (typeof obj[field][key] === 'string') {
                                obj[field][key] = sanitizeString(obj[field][key]);
                            }
                        }
                    }
                }
            }
        };

        if (fields.length > 0) {
            sanitizeObject(req.body, fields);
            sanitizeObject(req.query, fields);
        }

        next();
    };
};

module.exports = {
    validate,
    validateBody,
    validateQuery,
    validateParams,
    validateMultiple,
    validateFile,
    validateObjectId,
    validatePagination,
    validateDateRange,
    sanitizeHtml
};
