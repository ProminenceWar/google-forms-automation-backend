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
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .trim(),

    body('numeroOrden')
        .notEmpty()
        .withMessage('El número de orden es requerido')
        .isLength({ min: 3, max: 50 })
        .withMessage('El número de orden debe tener entre 3 y 50 caracteres')
        .matches(/^[A-Z0-9-_]+$/)
        .withMessage('El número de orden solo puede contener letras mayúsculas, números, guiones y guiones bajos')
        .trim()
        .toUpperCase()
        .custom(async (value) => {
            const existingForm = await FSOForm.findOne({ numeroOrden: value });
            if (existingForm) {
                throw new Error('El número de orden ya existe');
            }
            return true;
        }),

    body('tipoFSO')
        .notEmpty()
        .withMessage('El tipo de FSO es requerido')
        .isIn(Object.values(FSO_TYPES))
        .withMessage('Tipo de FSO inválido'),

    body('companiaInspeccion')
        .notEmpty()
        .withMessage('La compañía de inspección es requerida')
        .isLength({ min: 2, max: 100 })
        .withMessage('La compañía debe tener entre 2 y 100 caracteres')
        .trim(),

    body('nombreTecnico')
        .notEmpty()
        .withMessage('El nombre del técnico es requerido')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre del técnico debe tener entre 2 y 100 caracteres')
        .trim(),

    // Validaciones para campos de inspección técnica
    body('inspeccionTecnica.instalacionDireccionCorrecta')
        .isBoolean()
        .withMessage('instalacionDireccionCorrecta debe ser boolean'),

    body('inspeccionTecnica.combaFTB')
        .isBoolean()
        .withMessage('combaFTB debe ser boolean'),

    body('inspeccionTecnica.colocacionGripCorrecta')
        .isBoolean()
        .withMessage('colocacionGripCorrecta debe ser boolean'),

    body('inspeccionTecnica.alturaDropCorrecta')
        .isBoolean()
        .withMessage('alturaDropCorrecta debe ser boolean'),

    body('inspeccionTecnica.puntoApoyoAdecuado')
        .isBoolean()
        .withMessage('puntoApoyoAdecuado debe ser boolean'),

    body('inspeccionTecnica.dropLibreEmpalme')
        .isBoolean()
        .withMessage('dropLibreEmpalme debe ser boolean'),

    body('inspeccionTecnica.colocacionGanchosCorrecta')
        .isBoolean()
        .withMessage('colocacionGanchosCorrecta debe ser boolean'),

    body('inspeccionTecnica.recorridoDropExteriorAdecuado')
        .isBoolean()
        .withMessage('recorridoDropExteriorAdecuado debe ser boolean'),

    body('inspeccionTecnica.colocacionTestTerminalCorrecta')
        .isBoolean()
        .withMessage('colocacionTestTerminalCorrecta debe ser boolean'),

    body('inspeccionTecnica.jackSuperficieCorrecto')
        .isBoolean()
        .withMessage('jackSuperficieCorrecto debe ser boolean'),

    body('inspeccionTecnica.routerUbicadoCorrectamente')
        .isBoolean()
        .withMessage('routerUbicadoCorrectamente debe ser boolean'),

    body('inspeccionTecnica.configuredRouterAP')
        .isBoolean()
        .withMessage('configuredRouterAP debe ser boolean'),

    body('inspeccionTecnica.soporteRouterAdecuado')
        .isBoolean()
        .withMessage('soporteRouterAdecuado debe ser boolean'),

    body('inspeccionTecnica.cableadoInteriorOrdenado')
        .isBoolean()
        .withMessage('cableadoInteriorOrdenado debe ser boolean'),

    body('inspeccionTecnica.soporteCanalInterno')
        .isBoolean()
        .withMessage('soporteCanalInterno debe ser boolean'),

    body('inspeccionTecnica.tapadoPerforaciones')
        .isBoolean()
        .withMessage('tapadoPerforaciones debe ser boolean'),

    body('inspeccionTecnica.instalacionSinDanos')
        .isBoolean()
        .withMessage('instalacionSinDanos debe ser boolean'),

    body('inspeccionTecnica.limpiezaPostInstalacion')
        .isBoolean()
        .withMessage('limpiezaPostInstalacion debe ser boolean'),

    // Validaciones para mediciones técnicas
    body('medicionesTecnicas.velocidadDescargaMbps')
        .isFloat({ min: 0 })
        .withMessage('velocidadDescargaMbps debe ser un número positivo'),

    body('medicionesTecnicas.velocidadCargaMbps')
        .isFloat({ min: 0 })
        .withMessage('velocidadCargaMbps debe ser un número positivo'),

    body('medicionesTecnicas.latenciaMs')
        .isFloat({ min: 0 })
        .withMessage('latenciaMs debe ser un número positivo'),

    body('medicionesTecnicas.potenciaOpticaDbm')
        .isFloat()
        .withMessage('potenciaOpticaDbm debe ser un número'),

    body('medicionesTecnicas.potenciaOpticaOLT')
        .isFloat()
        .withMessage('potenciaOpticaOLT debe ser un número'),

    // Validaciones para información del cliente
    body('cliente.codigoCliente')
        .notEmpty()
        .withMessage('El código del cliente es requerido')
        .isLength({ min: 3, max: 20 })
        .withMessage('El código del cliente debe tener entre 3 y 20 caracteres'),

    body('cliente.razonSocial')
        .notEmpty()
        .withMessage('La razón social es requerida')
        .isLength({ min: 2, max: 200 })
        .withMessage('La razón social debe tener entre 2 y 200 caracteres'),

    body('cliente.contacto.nombre')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre del contacto debe tener entre 2 y 100 caracteres'),

    body('cliente.contacto.telefono')
        .optional()
        .matches(/^[+]?[\d\s-()]+$/)
        .withMessage('Formato de teléfono inválido'),

    body('cliente.contacto.email')
        .optional()
        .isEmail()
        .withMessage('Email del contacto inválido')
        .normalizeEmail(),

    // Validaciones para ubicación
    body('ubicacion.direccion')
        .notEmpty()
        .withMessage('La dirección es requerida')
        .isLength({ min: 5, max: 200 })
        .withMessage('La dirección debe tener entre 5 y 200 caracteres'),

    body('ubicacion.ciudad')
        .notEmpty()
        .withMessage('La ciudad es requerida')
        .isLength({ min: 2, max: 100 })
        .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),

    body('ubicacion.coordenadas.latitud')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitud debe estar entre -90 y 90'),

    body('ubicacion.coordenadas.longitud')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitud debe estar entre -180 y 180'),

    // Observaciones
    body('observaciones')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

    // Estado (opcional, se establece automáticamente si no se proporciona)
    body('estado')
        .optional()
        .isIn(Object.values(FSO_STATES))
        .withMessage('Estado inválido')
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
 * Validaciones para listado de formularios
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

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'numeroOrden', 'companiaInspeccion', 'nombreTecnico'])
        .withMessage('Campo de ordenamiento inválido'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Orden de clasificación inválido')
];

module.exports = {
    createFormValidation,
    updateFormValidation,
    deleteFormValidation,
    getFormValidation,
    listFormsValidation
};
