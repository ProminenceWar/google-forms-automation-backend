/**
 * @fileoverview Rutas de autenticación
 * @description Maneja login, registro, perfil y gestión de tokens JWT reales
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * Generar tokens JWT
 */
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        config.jwtSecret,
        { expiresIn: config.jwtExpiry || '24h' }
    );

    const refreshToken = jwt.sign(
        { id: userId, type: 'refresh' },
        config.jwtRefreshSecret || config.jwtSecret,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
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
        .withMessage('Email válido es requerido')
        .custom(async (email) => {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Contraseña debe tener al menos 6 caracteres'),
    body('nombre')
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('role')
        .optional()
        .isIn(['tecnico', 'supervisor', 'admin'])
        .withMessage('Rol debe ser: tecnico, supervisor o admin'),
    body('compania')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Compañía debe tener entre 2 y 100 caracteres')
];

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
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@fso-automation.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login exitoso
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login',
    loginValidators,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Buscar usuario en MongoDB
            const user = await User.findOne({
                email: email.toLowerCase()
            }).select('+password');

            if (!user || !user.isActive) {
                logger.warn('Intento de login con usuario inexistente o inactivo', {
                    email,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Credenciales inválidas',
                        type: 'UNAUTHORIZED'
                    }
                });
            }

            // Verificar contraseña
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                logger.warn('Intento de login con contraseña incorrecta', {
                    email,
                    userId: user._id,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Credenciales inválidas',
                        type: 'UNAUTHORIZED'
                    }
                });
            }

            // Generar tokens
            const { accessToken, refreshToken } = generateTokens(user._id);

            // Actualizar información de último login
            await User.findByIdAndUpdate(user._id, {
                ultimoAcceso: new Date(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Respuesta sin contraseña
            const userResponse = {
                id: user._id,
                email: user.email,
                nombre: user.nombre,
                role: user.role,
                compania: user.compania,
                isActive: user.isActive,
                fechaCreacion: user.fechaCreacion,
                ultimoAcceso: new Date()
            };

            logger.info('Login exitoso', {
                userId: user._id,
                email: user.email,
                role: user.role,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(200).json({
                success: true,
                message: 'Login exitoso',
                data: {
                    user: userResponse,
                    accessToken,
                    refreshToken,
                    expiresIn: '24h'
                }
            });

        } catch (error) {
            logger.error('Error en login:', {
                error: error.message,
                stack: error.stack,
                email: req.body?.email,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                error: {
                    message: 'Error interno del servidor',
                    type: 'INTERNAL_ERROR'
                }
            });
        }
    });

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: Registra un nuevo usuario en el sistema
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
 *               - nombre
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               role:
 *                 type: string
 *                 enum: [tecnico, supervisor, admin]
 *                 default: tecnico
 *               compania:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       409:
 *         description: Email ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/register',
    registerValidators,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email, password, nombre, role = 'tecnico', compania } = req.body;

            // Hash de la contraseña
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Crear nuevo usuario
            const newUser = new User({
                email: email.toLowerCase(),
                password: hashedPassword,
                nombre,
                role,
                compania,
                isActive: true,
                fechaCreacion: new Date(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            await newUser.save();

            // Generar tokens para login automático
            const { accessToken, refreshToken } = generateTokens(newUser._id);

            // Respuesta sin contraseña
            const userResponse = {
                id: newUser._id,
                email: newUser.email,
                nombre: newUser.nombre,
                role: newUser.role,
                compania: newUser.compania,
                isActive: newUser.isActive,
                fechaCreacion: newUser.fechaCreacion
            };

            logger.info('Usuario registrado exitosamente', {
                userId: newUser._id,
                email: newUser.email,
                role: newUser.role,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                data: {
                    user: userResponse,
                    accessToken,
                    refreshToken,
                    expiresIn: '24h'
                }
            });

        } catch (error) {
            logger.error('Error en registro:', {
                error: error.message,
                stack: error.stack,
                email: req.body?.email,
                ip: req.ip
            });

            // Manejar errores de duplicación
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: {
                        message: 'El email ya está registrado',
                        type: 'DUPLICATE_ERROR'
                    }
                });
            }

            res.status(500).json({
                success: false,
                error: {
                    message: 'Error interno del servidor',
                    type: 'INTERNAL_ERROR'
                }
            });
        }
    });

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     description: Obtiene la información del perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Buscar usuario actualizado en MongoDB
        const user = await User.findById(req.user.id).lean();

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario no válido',
                    type: 'INVALID_USER'
                }
            });
        }

        // Respuesta sin contraseña
        const userResponse = {
            id: user._id,
            email: user.email,
            nombre: user.nombre,
            role: user.role,
            compania: user.compania,
            isActive: user.isActive,
            fechaCreacion: user.fechaCreacion,
            ultimoAcceso: user.ultimoAcceso
        };

        logger.info('Perfil obtenido', {
            userId: user._id,
            email: user.email,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Perfil obtenido exitosamente',
            data: {
                user: userResponse
            }
        });

    } catch (error) {
        logger.error('Error al obtener perfil:', {
            error: error.message,
            userId: req.user?.id,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     description: Genera un nuevo token de acceso usando el refresh token
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
 *                 description: Refresh token válido
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *       401:
 *         description: Refresh token inválido
 *       500:
 *         description: Error interno del servidor
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Refresh token requerido',
                    type: 'MISSING_REFRESH_TOKEN'
                }
            });
        }

        // Verificar refresh token
        const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret || config.jwtSecret);

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token inválido',
                    type: 'INVALID_TOKEN_TYPE'
                }
            });
        }

        // Buscar usuario
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario no válido',
                    type: 'INVALID_USER'
                }
            });
        }

        // Generar nuevos tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

        logger.info('Token renovado exitosamente', {
            userId: user._id,
            email: user.email,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Token renovado exitosamente',
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        logger.error('Error al renovar token:', {
            error: error.message,
            ip: req.ip
        });

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Refresh token inválido o expirado',
                    type: 'INVALID_REFRESH_TOKEN'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Invalida el token de acceso del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *       401:
 *         description: No autorizado
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // En una implementación completa, aquí se invalidaría el token
        // Por simplicidad, solo registramos el logout

        logger.info('Usuario cerró sesión', {
            userId: req.user.id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(200).json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        logger.error('Error al cerrar sesión:', {
            error: error.message,
            userId: req.user?.id,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error interno del servidor',
                type: 'INTERNAL_ERROR'
            }
        });
    }
});

module.exports = router;
