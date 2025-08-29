/**
 * @fileoverview Rutas de autenticación mejoradas con refresh tokens
 * @description Sistema completo de autenticación con tokens seguros
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const TokenService = require('../services/tokenService');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting específico para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 intentos por IP (muy permisivo para pruebas)
    skip: () => process.env.NODE_ENV === 'development', // Saltar en desarrollo
    message: {
        success: false,
        error: {
            message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
            type: 'RATE_LIMIT_EXCEEDED',
            code: 'TOO_MANY_ATTEMPTS'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para refresh token
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 refresh por IP (muy permisivo para pruebas)
    skip: () => process.env.NODE_ENV === 'development', // Saltar en desarrollo
    message: {
        success: false,
        error: {
            message: 'Demasiados intentos de refresh. Intenta de nuevo en 15 minutos.',
            type: 'RATE_LIMIT_EXCEEDED',
            code: 'TOO_MANY_REFRESH_ATTEMPTS'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validadores
const loginValidators = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido requerido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password debe tener al menos 6 caracteres')
];

const refreshValidators = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token requerido')
        .isJWT()
        .withMessage('Refresh token debe ser un JWT válido')
];

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica usuario y retorna tokens de acceso y renovación
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@fso.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                         company:
 *                           type: string
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: string
 *                         refreshExpiresIn:
 *                           type: string
 *       401:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos
 */
router.post('/login', authLimiter, loginValidators, async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Datos de entrada inválidos',
                    type: 'VALIDATION_ERROR',
                    details: errors.array()
                }
            });
        }

        const { email, password } = req.body;

        // Buscar usuario
        const user = await User.findOne({ email });
        if (!user) {
            // Log intento de login con email inexistente
            logger.warn('Intento de login con email inexistente:', {
                email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                success: false,
                error: {
                    message: 'Credenciales inválidas',
                    type: 'INVALID_CREDENTIALS',
                    code: 'EMAIL_NOT_FOUND'
                }
            });
        }

        // Verificar password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            // Log intento de login con password incorrecta
            logger.warn('Intento de login con password incorrecta:', {
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                success: false,
                error: {
                    message: 'Credenciales inválidas',
                    type: 'INVALID_CREDENTIALS',
                    code: 'INVALID_PASSWORD'
                }
            });
        }

        // Verificar si el usuario está activo
        if (!user.active) {
            logger.warn('Intento de login con usuario inactivo:', {
                userId: user._id,
                email: user.email,
                ip: req.ip
            });

            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario inactivo',
                    type: 'INACTIVE_USER',
                    code: 'USER_INACTIVE'
                }
            });
        }

        // Generar tokens
        const tokens = await TokenService.generateTokenPair(user._id, {
            loginTime: Math.floor(Date.now() / 1000),
            loginIP: req.ip
        });

        // Actualizar último login
        user.lastLogin = new Date();
        await user.save();

        // Log login exitoso
        logger.info('Login exitoso:', {
            userId: user._id,
            email: user.email,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Respuesta exitosa
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    company: user.company,
                    lastLogin: user.lastLogin
                },
                tokens
            },
            message: 'Login exitoso'
        });

    } catch (error) {
        logger.error('Error en login:', {
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'LOGIN_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     description: Usa refresh token para obtener nuevo access token
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token válido
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                     refreshExpiresIn:
 *                       type: string
 *       401:
 *         description: Refresh token inválido o expirado
 *       429:
 *         description: Demasiados intentos
 */
router.post('/refresh', refreshLimiter, refreshValidators, async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Refresh token inválido',
                    type: 'VALIDATION_ERROR',
                    details: errors.array()
                }
            });
        }

        const { refreshToken } = req.body;

        // Renovar tokens usando TokenService
        const newTokens = await TokenService.refreshAccessToken(refreshToken);

        // Log renovación exitosa
        logger.info('Token renovado exitosamente:', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(200).json({
            success: true,
            data: newTokens,
            message: 'Token renovado exitosamente'
        });

    } catch (error) {
        // Log error de renovación
        logger.warn('Error renovando token:', {
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Determinar código de estado basado en el error
        let statusCode = 401;
        let errorCode = 'REFRESH_ERROR';

        if (error.message.includes('malformado')) {
            errorCode = 'MALFORMED_TOKEN';
        } else if (error.message.includes('expirado')) {
            errorCode = 'EXPIRED_TOKEN';
        } else if (error.message.includes('inválido') || error.message.includes('comprometido')) {
            errorCode = 'INVALID_TOKEN';
        }

        res.status(statusCode).json({
            success: false,
            error: {
                message: error.message,
                type: 'REFRESH_TOKEN_ERROR',
                code: errorCode
            }
        });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Revoca el refresh token actual
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token a revocar
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logout exitoso
 *       401:
 *         description: No autorizado
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Refresh token requerido',
                    type: 'VALIDATION_ERROR',
                    code: 'MISSING_REFRESH_TOKEN'
                }
            });
        }

        // Revocar refresh token específico
        const revoked = await TokenService.revokeRefreshToken(req.user.id, refreshToken);

        if (!revoked) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'No se pudo revocar el refresh token',
                    type: 'REVOKE_ERROR',
                    code: 'REVOKE_FAILED'
                }
            });
        }

        // Log logout exitoso
        logger.info('Logout exitoso:', {
            userId: req.user.id,
            email: req.user.email,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Logout exitoso'
        });

    } catch (error) {
        logger.error('Error en logout:', {
            error: error.message,
            userId: req.user?.id,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'LOGOUT_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Cerrar todas las sesiones
 *     description: Revoca todos los refresh tokens del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las sesiones cerradas
 *       401:
 *         description: No autorizado
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
    try {
        // Revocar todos los refresh tokens
        const revoked = await TokenService.revokeAllRefreshTokens(req.user.id);

        if (!revoked) {
            return res.status(500).json({
                success: false,
                error: {
                    message: 'No se pudieron revocar todos los tokens',
                    type: 'REVOKE_ERROR',
                    code: 'REVOKE_ALL_FAILED'
                }
            });
        }

        // Log logout completo
        logger.info('Logout completo (todas las sesiones):', {
            userId: req.user.id,
            email: req.user.email,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Todas las sesiones cerradas exitosamente'
        });

    } catch (error) {
        logger.error('Error en logout completo:', {
            error: error.message,
            userId: req.user?.id,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'LOGOUT_ALL_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/auth/token-info:
 *   get:
 *     summary: Información de tokens del usuario
 *     description: Obtiene información sobre los tokens activos del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información de tokens obtenida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     email:
 *                       type: string
 *                     activeTokens:
 *                       type: number
 *                     tokens:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           createdAt:
 *                             type: string
 *                           expiresAt:
 *                             type: string
 *                           isExpired:
 *                             type: boolean
 */
router.get('/token-info', authenticateToken, async (req, res) => {
    try {
        const tokenInfo = await TokenService.getTokenInfo(req.user.id);

        res.status(200).json({
            success: true,
            data: tokenInfo
        });

    } catch (error) {
        logger.error('Error obteniendo información de tokens:', {
            error: error.message,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error obteniendo información de tokens',
                type: 'INTERNAL_ERROR',
                code: 'TOKEN_INFO_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Información del usuario actual
 *     description: Obtiene información del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     company:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                company: req.user.company,
                isActive: req.user.isActive
            }
        });

    } catch (error) {
        logger.error('Error obteniendo información del usuario:', {
            error: error.message,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error obteniendo información del usuario',
                type: 'INTERNAL_ERROR'
            }
        });
    }
});

module.exports = router;
