/**
 * @fileoverview Middleware para manejo de validaciones
 * @description Middleware que procesa errores de validación y los formatea
 */

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware para verificar y manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }));

        logger.warn('Errores de validación', {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            errors: formattedErrors
        });

        return res.status(400).json({
            success: false,
            error: {
                message: 'Errores de validación',
                type: 'VALIDATION_ERROR',
                details: formattedErrors
            }
        });
    }

    next();
};

/**
 * Middleware para manejar errores de autenticación
 */
const handleAuthError = (error, req, res, next) => {
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Token inválido',
                type: 'INVALID_TOKEN'
            }
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Token expirado',
                type: 'EXPIRED_TOKEN'
            }
        });
    }

    next(error);
};

/**
 * Middleware para calcular puntuación automática de formularios FSO
 */
const calculateFormScore = (req, res, next) => {
    if (req.body.inspeccionTecnica) {
        const inspeccion = req.body.inspeccionTecnica;
        const totalCampos = Object.keys(inspeccion).length;
        const camposPositivos = Object.values(inspeccion).filter(Boolean).length;

        // Calcular puntuación como porcentaje
        const puntuacion = totalCampos > 0 ? Math.round((camposPositivos / totalCampos) * 100) : 0;

        // Agregar puntuación al body
        req.body.puntuacionCalculada = puntuacion;

        // Determinar estado automático basado en puntuación si no se proporciona
        if (!req.body.estado) {
            if (puntuacion >= 95) {
                req.body.estado = 'completed';
            } else if (puntuacion >= 80) {
                req.body.estado = 'in_progress';
            } else {
                req.body.estado = 'pending';
            }
        }
    }

    next();
};

/**
 * Middleware para verificar permisos de modificación
 */
const checkFormPermissions = (action = 'read') => {
    return async (req, res, next) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Usuario no autenticado',
                        type: 'UNAUTHORIZED'
                    }
                });
            }

            // Admin puede hacer todo
            if (user.role === 'admin') {
                return next();
            }

            // Para acciones de escritura, verificar si es el creador
            if (action !== 'read' && req.params.id) {
                const { FSOForm } = require('../models');
                const form = await FSOForm.findById(req.params.id);

                if (!form) {
                    return res.status(404).json({
                        success: false,
                        error: {
                            message: 'Formulario no encontrado',
                            type: 'NOT_FOUND'
                        }
                    });
                }

                // Solo el creador o admin puede modificar/eliminar
                if (form.creadoPor && form.creadoPor.toString() !== user.id) {
                    return res.status(403).json({
                        success: false,
                        error: {
                            message: 'No tienes permisos para realizar esta acción',
                            type: 'FORBIDDEN'
                        }
                    });
                }
            }

            next();
        } catch (error) {
            logger.error('Error al verificar permisos:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Error interno del servidor',
                    type: 'INTERNAL_ERROR'
                }
            });
        }
    };
};

module.exports = {
    handleValidationErrors,
    handleAuthError,
    calculateFormScore,
    checkFormPermissions
};
