/**
 * @fileoverview Rutas de autenticación
 * @description Maneja login, registro, perfil y gestión de tokens
 */

const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const config = require('../config');
const logger = require('../utils/logger');

// Importar modelos (simulados por ahora)
// const User = require('../models/User');

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
 * POST /api/v1/auth/login
 * Inicia sesión con email y contraseña
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

        // Simulación de búsqueda de usuario (implementar con MongoDB)
        const mockUsers = {
            'admin@fso-automation.com': {
                id: '1',
                email: 'admin@fso-automation.com',
                password: '$2a$12$OfSsSBuiV9ey5BPVquwIr.NnzB..bGZWXrjjlmYPbx/sDPs1B7c2i', // admin123
                name: 'Administrador Sistema',
                role: 'admin',
                company: 'FSO Automation Corp',
                active: true
            },
            'supervisor@techinstall.com': {
                id: '2',
                email: 'supervisor@techinstall.com',
                password: '$2a$12$OfSsSBuiV9ey5BPVquwIr.NnzB..bGZWXrjjlmYPbx/sDPs1B7c2i', // admin123
                name: 'María González',
                role: 'supervisor',
                company: 'TechInstall Corp',
                active: true
            },
            'tecnico@techinstall.com': {
                id: '3',
                email: 'tecnico@techinstall.com',
                password: '$2a$12$OfSsSBuiV9ey5BPVquwIr.NnzB..bGZWXrjjlmYPbx/sDPs1B7c2i', // admin123
                name: 'Carlos López',
                role: 'tecnico',
                company: 'TechInstall Corp',
                active: true
            }
        };

        const user = mockUsers[email];

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
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    company: user.company
                },
                expiresIn: config.jwt.expiresIn
            }
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

        // Simulación - en producción verificar si el usuario ya existe
        // const existingUser = await User.findOne({ email });

        // Hash de la contraseña
        const hashedPassword = await bcryptjs.hash(password, config.encryption.saltRounds);

        // Simulación de creación de usuario
        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            name,
            role,
            company,
            active: true,
            createdAt: new Date().toISOString()
        };

        logger.info('Usuario registrado exitosamente:', {
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role,
            company: newUser.company
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                    company: newUser.company
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
 * GET /api/v1/auth/profile
 * Obtiene el perfil del usuario autenticado
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Simulación - obtener datos completos del usuario
        const userProfile = {
            id: req.user.id,
            email: req.user.email,
            name: 'Usuario Simulado',
            role: req.user.role,
            company: req.user.company,
            active: true,
            lastLogin: new Date().toISOString(),
            profile: {
                phone: '+52 555 123 4567',
                timezone: 'America/Mexico_City',
                language: 'es'
            },
            preferences: {
                emailNotifications: true,
                pushNotifications: true,
                theme: 'light'
            }
        };

        res.status(200).json({
            success: true,
            message: 'Perfil obtenido exitosamente',
            data: {
                user: userProfile
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
