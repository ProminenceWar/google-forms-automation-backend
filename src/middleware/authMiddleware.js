/**
 * @fileoverview Middleware de autenticación JWT mejorado
 * @description Manejo de autenticación con tokens JWT usando TokenService
 */

const TokenService = require('../services/tokenService');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware de autenticación con JWT usando TokenService
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
                    type: 'UNAUTHORIZED',
                    code: 'MISSING_TOKEN'
                }
            });
        }

        // Validar token usando TokenService
        const decoded = await TokenService.validateAccessToken(token);

        // Buscar usuario completo para el request
        const user = await User.findById(decoded.id).select('-password -refreshTokens');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario no válido',
                    type: 'INVALID_USER',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        // Verificar si el usuario está activo
        if (!user.active) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario inactivo',
                    type: 'INACTIVE_USER',
                    code: 'USER_INACTIVE'
                }
            });
        }

        // Agregar usuario a la request con información completa
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            company: user.company,
            isActive: user.active,
            // Claims adicionales del token
            iat: decoded.iat,
            exp: decoded.exp
        };

        // Log del acceso exitoso
        logger.info('Usuario autenticado exitosamente', {
            userId: user._id,
            email: user.email,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: `${req.method} ${req.originalUrl}`,
            tokenAge: Math.floor(Date.now() / 1000) - decoded.iat
        });

        next();

    } catch (error) {
        // Manejo específico de errores de token
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token malformado',
                    type: 'INVALID_TOKEN',
                    code: 'MALFORMED_TOKEN'
                }
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token expirado',
                    type: 'EXPIRED_TOKEN',
                    code: 'TOKEN_EXPIRED'
                }
            });
        }

        if (error.name === 'NotBeforeError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token no válido aún',
                    type: 'INVALID_TOKEN',
                    code: 'TOKEN_NOT_ACTIVE'
                }
            });
        }

        // Log del error de autenticación
        logger.error('Error en autenticación:', {
            error: error.message,
            type: error.name,
            stack: error.stack,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: `${req.method} ${req.originalUrl}`
        });

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
