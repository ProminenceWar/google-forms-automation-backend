// forms.js
// Rutas para formularios

const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route POST /api/forms/submit
 * @desc Envía datos a un formulario de Google
 * @access Public (requiere sesión válida)
 */
router.post('/submit', asyncHandler(formController.submitForm));

/**
 * @route GET /api/forms/mock-data
 * @desc Obtiene datos de prueba para formularios
 * @access Public
 */
router.get('/mock-data', asyncHandler(formController.getMockData));

/**
 * @route GET /api/forms/validate-url
 * @desc Valida si una URL es un formulario de Google válido
 * @access Public
 */
router.get('/validate-url', asyncHandler(formController.validateFormUrl));

/**
 * @route POST /api/forms/test-submit
 * @desc Realiza una prueba de envío con datos mock
 * @access Public (requiere sesión válida)
 */
router.post('/test-submit', asyncHandler(formController.testSubmit));

module.exports = router;
