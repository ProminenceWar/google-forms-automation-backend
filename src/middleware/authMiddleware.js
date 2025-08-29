/**
 * @fileoverview Middleware de autenticación JWT
 * @description Manejo de autenticación con tokens JWT reales
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Middleware de autenticación con JWT real
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token de acceso requerido',
                    type: 'UNAUTHORIZED'
                }
            });
        }

        // Verificar token JWT
        const decoded = jwt.verify(token, config.jwt.secret);

        // Buscar usuario en MongoDB
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario no válido',
                    type: 'INVALID_USER'
                }
            });
        }

        // Verificar si el usuario está activo
        if (!user.active) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario inactivo',
                    type: 'INACTIVE_USER'
                }
            });
        }

        // Agregar usuario a la request
        req.user = {
            id: user._id.toString(),
            email: user.email,
            nombre: user.name,
            role: user.role,
            isActive: user.active
        };

        // Log del acceso
        logger.info('Usuario autenticado', {
            userId: user._id,
            email: user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: `${req.method} ${req.originalUrl}`
        });

        next();

    } catch (error) {
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

        logger.error('Error en autenticación:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR'
            }
        });
    }
};

/**
 * Middleware para verificar roles específicos
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario no autenticado',
                    type: 'UNAUTHORIZED'
                }
            });
        }

        const userRole = req.user.role;
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Permisos insuficientes',
                    type: 'INSUFFICIENT_PERMISSIONS'
                }
            });
        }

        next();
    };
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findById(decoded.id).select('-password');

        if (user && user.active) {
            req.user = {
                id: user._id.toString(),
                email: user.email,
                nombre: user.name,
                role: user.role,
                isActive: user.active
            };
        }

        next();

    } catch (error) {
        // En autenticación opcional, los errores no son bloqueantes
        next();
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth
};
