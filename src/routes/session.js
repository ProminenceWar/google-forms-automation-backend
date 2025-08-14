// session.js
// Rutas para sesiones

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route POST /api/session/login
 * @desc Inicia el proceso de login manual en Google
 * @access Public
 */
router.post('/login', asyncHandler(sessionController.login));

/**
 * @route GET /api/session/status
 * @desc Obtiene el estado actual de la sesión
 * @access Public
 */
router.get('/status', asyncHandler(sessionController.getStatus));

/**
 * @route POST /api/session/logout
 * @desc Cierra la sesión actual y limpia cookies
 * @access Public
 */
router.post('/logout', asyncHandler(sessionController.logout));

/**
 * @route POST /api/session/refresh
 * @desc Actualiza la actividad de la sesión
 * @access Public
 */
router.post('/refresh', asyncHandler(sessionController.refresh));

module.exports = router;
