/**
 * @fileoverview Rutas de autenticación
 * @description Maneja login, registro, perfil y gestión de tokens
 */

const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Middleware para validar tokens JWT
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Token de acceso requerido',
                type: 'UNAUTHORIZED',
                code: 'AUTH_001'
            }
        });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Token inválido o expirado',
                    type: 'FORBIDDEN',
                    code: 'AUTH_002'
                }
            });
        }
        req.user = user;
        next();
    });
};

/**
 * Validadores de entrada
 */
const loginValidators = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido es requerido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Contraseña debe tener al menos 6 caracteres')
];

const registerValidators = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido es requerido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Contraseña debe tener al menos 6 caracteres'),
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('role')
        .isIn(['tecnico', 'supervisor', 'admin'])
        .withMessage('Rol debe ser: tecnico, supervisor o admin'),
    body('company')
        .isLength({ min: 2, max: 100 })
        .withMessage('Compañía debe tener entre 2 y 100 caracteres')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@fso-automation.com
 *         password:
 *           type: string
 *           format: password
 *           example: admin123
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login exitoso"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             expiresIn:
 *               type: string
 *               example: "1h"
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario con email y contraseña, retorna JWT tokens
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginValidators, async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Datos de entrada inválidos',
                    type: 'VALIDATION_ERROR',
                    code: 'AUTH_003',
                    details: errors.array()
                }
            });
        }

        const { email, password } = req.body;

        // Buscar usuario en MongoDB
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password') // Incluir password ya que está marcado como select: false
            .lean();

        if (!user || !user.active) {
            logger.warn('Intento de login con usuario inexistente o inactivo:', { email });
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Credenciales inválidas',
                    type: 'UNAUTHORIZED',
                    code: 'AUTH_004'
                }
            });
        }

        // Verificar contraseña
        const passwordMatch = await bcryptjs.compare(password, user.password);
        if (!passwordMatch) {
            logger.warn('Intento de login con contraseña incorrecta:', { email });
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Credenciales inválidas',
                    type: 'UNAUTHORIZED',
                    code: 'AUTH_004'
                }
            });
        }

        // Generar tokens
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            company: user.company
        };

        const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn
        });

        const refreshToken = jwt.sign(tokenPayload, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpiresIn
        });

        logger.info('Login exitoso:', {
            userId: user.id,
            email: user.email,
            role: user.role,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: {
                token: accessToken,
                refreshToken: refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    company: user.company
                },
                expiresIn: config.jwt.expiresIn
            }
        });

        // Actualizar último login
        await User.findByIdAndUpdate(user._id, {
            lastLogin: new Date(),
            loginAttempts: 0,
            lockUntil: null
        });

    } catch (error) {
        logger.error('Error en login:', {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'AUTH_005'
            }
        });
    }
});

/**
 * POST /api/v1/auth/register
 * Registra un nuevo usuario
 */
router.post('/register', registerValidators, async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Datos de entrada inválidos',
                    type: 'VALIDATION_ERROR',
                    code: 'AUTH_003',
                    details: errors.array()
                }
            });
        }

        const { email, password, name, role, company } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'El usuario ya existe',
                    type: 'USER_EXISTS',
                    code: 'AUTH_006'
                }
            });
        }

        // Hash de la contraseña
        const hashedPassword = await bcryptjs.hash(password, config.encryption.saltRounds);

        // Crear nuevo usuario
        const newUser = new User({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            role,
            company,
            active: true
        });

        const savedUser = await newUser.save();

        logger.info('Usuario registrado exitosamente:', {
            userId: savedUser._id,
            email: savedUser.email,
            role: savedUser.role,
            company: savedUser.company
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: savedUser._id,
                    email: savedUser.email,
                    name: savedUser.name,
                    role: savedUser.role,
                    company: savedUser.company
                }
            }
        });

    } catch (error) {
        logger.error('Error en registro:', {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'AUTH_006'
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Obtener perfil de usuario
 *     description: Retorna la información del perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Perfil obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Token de acceso requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Obtener datos completos del usuario desde MongoDB
        const userProfile = await User.findById(req.user.id).lean();

        if (!userProfile) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Usuario no encontrado',
                    type: 'NOT_FOUND',
                    code: 'AUTH_007'
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Perfil obtenido exitosamente',
            data: {
                user: {
                    id: userProfile._id,
                    email: userProfile.email,
                    name: userProfile.name,
                    role: userProfile.role,
                    company: userProfile.company,
                    active: userProfile.active,
                    lastLogin: userProfile.lastLogin,
                    profile: userProfile.profile,
                    preferences: userProfile.preferences
                }
            }
        });

    } catch (error) {
        logger.error('Error al obtener perfil:', {
            error: error.message,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'AUTH_007'
            }
        });
    }
});

/**
 * POST /api/v1/auth/refresh
 * Renueva el token de acceso usando el refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Refresh token requerido',
                    type: 'UNAUTHORIZED',
                    code: 'AUTH_008'
                }
            });
        }

        // Verificar refresh token
        jwt.verify(refreshToken, config.jwt.refreshSecret, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: {
                        message: 'Refresh token inválido',
                        type: 'FORBIDDEN',
                        code: 'AUTH_009'
                    }
                });
            }

            // Generar nuevo access token
            const tokenPayload = {
                id: user.id,
                email: user.email,
                role: user.role,
                company: user.company
            };

            const newAccessToken = jwt.sign(tokenPayload, config.jwt.secret, {
                expiresIn: config.jwt.expiresIn
            });

            res.status(200).json({
                success: true,
                message: 'Token renovado exitosamente',
                data: {
                    token: newAccessToken,
                    expiresIn: config.jwt.expiresIn
                }
            });
        });

    } catch (error) {
        logger.error('Error al renovar token:', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'AUTH_010'
            }
        });
    }
});

/**
 * POST /api/v1/auth/logout
 * Cierra la sesión del usuario
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // En producción, agregar token a lista negra o invalidar en BD

        logger.info('Usuario cerró sesión:', {
            userId: req.user.id,
            email: req.user.email,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        logger.error('Error al cerrar sesión:', {
            error: error.message,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR',
                code: 'AUTH_011'
            }
        });
    }
});

module.exports = router;
