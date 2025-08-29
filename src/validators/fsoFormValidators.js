/**
 * @fileoverview Validadores para formularios FSO
 * @description Validaciones específicas para operaciones CRUD de formularios FSO
 */

const { body, param, query } = require('express-validator');
const { FSOForm } = require('../models');
const { FSO_TYPES, FSO_STATES } = require('../constants');

/**
 * Validaciones para crear un formulario FSO
 */
const createFormValidation = [
    // Campos requeridos principales
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .trim(),

    body('numeroOrden')
        .notEmpty()
        .withMessage('El número de orden es requerido')
        .isString()
        .withMessage('El número de orden debe ser una cadena')
        .trim(),

    body('tipoFSO')
        .notEmpty()
        .withMessage('El tipo de FSO es requerido')
        .isString()
        .withMessage('El tipo de FSO debe ser una cadena')
        .trim(),

    body('companiaInspeccion')
        .notEmpty()
        .withMessage('La compañía de inspección es requerida')
        .isString()
        .withMessage('La compañía de inspección debe ser una cadena')
        .trim(),

    body('nombreTecnico')
        .notEmpty()
        .withMessage('El nombre del técnico es requerido')
        .isString()
        .withMessage('El nombre del técnico debe ser una cadena')
        .trim(),

    body('comentariosCaso')
        .notEmpty()
        .withMessage('Los comentarios del caso son requeridos')
        .isString()
        .withMessage('Los comentarios del caso deben ser una cadena')
        .trim(),

    // Validaciones para datosCliente (requerido)
    body('datosCliente')
        .notEmpty()
        .withMessage('Los datos del cliente son requeridos')
        .isObject()
        .withMessage('Los datos del cliente deben ser un objeto'),

    body('datosCliente.nombreCliente')
        .notEmpty()
        .withMessage('El nombre del cliente es requerido')
        .isString()
        .withMessage('El nombre del cliente debe ser una cadena')
        .trim(),

    body('datosCliente.telefonoCliente')
        .notEmpty()
        .withMessage('El teléfono del cliente es requerido')
        .isString()
        .withMessage('El teléfono del cliente debe ser una cadena')
        .trim(),

    body('datosCliente.puntuacionCliente')
        .notEmpty()
        .withMessage('La puntuación del cliente es requerida')
        .isNumeric()
        .withMessage('La puntuación del cliente debe ser un número'),

    // Validaciones para itemsInspeccion (requerido)
    body('itemsInspeccion')
        .notEmpty()
        .withMessage('Los items de inspección son requeridos')
        .isObject()
        .withMessage('Los items de inspección deben ser un objeto'),

    body('itemsInspeccion.instalacionDireccionCorrecta')
        .isBoolean()
        .withMessage('instalacionDireccionCorrecta debe ser boolean'),

    body('itemsInspeccion.combaFTB')
        .isBoolean()
        .withMessage('combaFTB debe ser boolean'),

    body('itemsInspeccion.colocacionGripCorrecta')
        .isBoolean()
        .withMessage('colocacionGripCorrecta debe ser boolean'),

    body('itemsInspeccion.alturaDropCorrecta')
        .isBoolean()
        .withMessage('alturaDropCorrecta debe ser boolean'),

    body('itemsInspeccion.puntoApoyoAdecuado')
        .isBoolean()
        .withMessage('puntoApoyoAdecuado debe ser boolean'),

    body('itemsInspeccion.dropLibreEmpalme')
        .isBoolean()
        .withMessage('dropLibreEmpalme debe ser boolean'),

    body('itemsInspeccion.colocacionGanchosCorrecta')
        .isBoolean()
        .withMessage('colocacionGanchosCorrecta debe ser boolean'),

    body('itemsInspeccion.recorridoDropExteriorAdecuado')
        .isBoolean()
        .withMessage('recorridoDropExteriorAdecuado debe ser boolean'),

    body('itemsInspeccion.colocacionTestTerminalCorrecta')
        .isBoolean()
        .withMessage('colocacionTestTerminalCorrecta debe ser boolean'),

    body('itemsInspeccion.jackSuperficieCorrecto')
        .isBoolean()
        .withMessage('jackSuperficieCorrecto debe ser boolean'),

    body('itemsInspeccion.potenciaCorrecta')
        .isBoolean()
        .withMessage('potenciaCorrecta debe ser boolean'),

    body('itemsInspeccion.routerUbicadoCorrectamente')
        .isBoolean()
        .withMessage('routerUbicadoCorrectamente debe ser boolean'),

    // Validaciones para medicionesTecnicas (requerido)
    body('medicionesTecnicas')
        .notEmpty()
        .withMessage('Las mediciones técnicas son requeridas')
        .isObject()
        .withMessage('Las mediciones técnicas deben ser un objeto'),

    body('medicionesTecnicas.metrosDrop')
        .notEmpty()
        .withMessage('Los metros de drop son requeridos')
        .isString()
        .withMessage('Los metros de drop deben ser una cadena')
        .trim(),

    body('medicionesTecnicas.potencia')
        .notEmpty()
        .withMessage('La potencia es requerida')
        .isString()
        .withMessage('La potencia debe ser una cadena')
        .trim(),

    // Campos opcionales (pueden estar undefined)
    body('id')
        .optional(),

    body('estado')
        .optional(),

    body('fechaActualizacion')
        .optional(),

    body('fechaCreacion')
        .optional(),

    body('puntuacionCalculada')
        .optional(),

    body('ubicacion')
        .optional()
];

/**
 * Validaciones para actualizar un formulario FSO
 */
const updateFormValidation = [
    param('id')
        .isMongoId()
        .withMessage('ID inválido'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .trim(),

    body('numeroOrden')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('El número de orden debe tener entre 3 y 50 caracteres')
        .matches(/^[A-Z0-9-_]+$/)
        .withMessage('El número de orden solo puede contener letras mayúsculas, números, guiones y guiones bajos')
        .trim()
        .toUpperCase()
        .custom(async (value, { req }) => {
            if (value) {
                const existingForm = await FSOForm.findOne({
                    numeroOrden: value,
                    _id: { $ne: req.params.id }
                });
                if (existingForm) {
                    throw new Error('El número de orden ya existe');
                }
            }
            return true;
        }),

    body('tipoFSO')
        .optional()
        .isIn(Object.values(FSO_TYPES))
        .withMessage('Tipo de FSO inválido'),

    body('companiaInspeccion')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('La compañía debe tener entre 2 y 100 caracteres')
        .trim(),

    body('nombreTecnico')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre del técnico debe tener entre 2 y 100 caracteres')
        .trim(),

    body('estado')
        .optional()
        .isIn(Object.values(FSO_STATES))
        .withMessage('Estado inválido'),

    // Las demás validaciones opcionales para actualización
    body('observaciones')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres')
];

/**
 * Validaciones para eliminar un formulario FSO
 */
const deleteFormValidation = [
    param('id')
        .isMongoId()
        .withMessage('ID inválido')
];

/**
 * Validaciones para obtener un formulario específico
 */
const getFormValidation = [
    param('id')
        .isMongoId()
        .withMessage('ID inválido')
];

/**
 * Validaciones para listado de formularios con filtros avanzados
 */
const listFormsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero mayor a 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100'),

    query('status')
        .optional()
        .isIn(Object.values(FSO_STATES))
        .withMessage('Estado inválido'),

    query('tipoFSO')
        .optional()
        .isIn(Object.values(FSO_TYPES))
        .withMessage('Tipo de FSO inválido'),

    query('companiaInspeccion')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre de la compañía debe tener entre 1 y 100 caracteres')
        .trim(),

    query('nombreTecnico')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre del técnico debe tener entre 1 y 100 caracteres')
        .trim(),

    query('fechaInicio')
        .optional()
        .isISO8601()
        .withMessage('La fecha de inicio debe ser una fecha válida en formato ISO 8601'),

    query('fechaFin')
        .optional()
        .isISO8601()
        .withMessage('La fecha de fin debe ser una fecha válida en formato ISO 8601'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('El término de búsqueda debe tener entre 1 y 100 caracteres')
        .trim(),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'numeroOrden', 'estado', 'tipoFSO', 'companiaInspeccion', 'nombreTecnico', 'puntuacionCalculada'])
        .withMessage('Campo de ordenamiento inválido'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Orden de clasificación inválido'),

    query('includeArchivos')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('includeArchivos debe ser true o false'),

    query('includeHistorial')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('includeHistorial debe ser true o false')
];

module.exports = {
    createFormValidation,
    updateFormValidation,
    deleteFormValidation,
    getFormValidation,
    listFormsValidation
};
