/**
 * @fileoverview Índice de validadores
 * @description Exporta todos los validadores y middleware de validación
 */

// Importar esquemas de validación
const authValidators = require('./authValidators');
const fsoValidators = require('./fsoValidators');
const fileValidators = require('./fileValidators');

// Importar middleware de validación
const {
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
} = require('./middleware');

module.exports = {
    // Esquemas de validación
    auth: authValidators,
    fso: fsoValidators,
    file: fileValidators,

    // Middleware de validación
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
