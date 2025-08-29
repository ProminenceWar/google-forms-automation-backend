/**
 * @fileoverview Servicio de gestión de tokens JWT
 * @description Maneja la creación, validación y rotación de tokens de forma segura
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

class TokenService {
    /**
     * Generar par de tokens (access + refresh)
     * @param {string} userId - ID del usuario
     * @param {Object} additionalClaims - Claims adicionales para el access token
     * @returns {Promise<Object>} - { accessToken, refreshToken, expiresIn }
     */
    static async generateTokenPair(userId, additionalClaims = {}) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.active) {
                throw new Error('Usuario no válido');
            }

            // Limpiar tokens expirados del usuario
            await user.cleanExpiredTokens();

            // Generar access token con claims básicos + adicionales
            const accessTokenPayload = {
                id: userId,
                email: user.email,
                role: user.role,
                company: user.company,
                iat: Math.floor(Date.now() / 1000),
                ...additionalClaims
            };

            const accessToken = jwt.sign(
                accessTokenPayload,
                config.jwt.secret,
                {
                    expiresIn: config.jwt.expiresIn || '1h',
                    issuer: 'fso-automation',
                    audience: 'fso-users'
                }
            );

            // Generar refresh token único y seguro
            const refreshTokenId = crypto.randomUUID();
            const refreshTokenPayload = {
                id: userId,
                tokenId: refreshTokenId,
                type: 'refresh',
                iat: Math.floor(Date.now() / 1000)
            };

            const refreshToken = jwt.sign(
                refreshTokenPayload,
                config.jwt.refreshSecret,
                {
                    expiresIn: config.jwt.refreshExpiresIn || '30d',
                    issuer: 'fso-automation',
                    audience: 'fso-users'
                }
            );

            // Calcular fecha de expiración del refresh token
            const refreshExpiresIn = config.jwt.refreshExpiresIn || '30d';
            const expiresAt = new Date();

            // Parsear el tiempo de expiración
            const timeValue = parseInt(refreshExpiresIn);
            const timeUnit = refreshExpiresIn.slice(-1);

            switch (timeUnit) {
                case 'd':
                    expiresAt.setDate(expiresAt.getDate() + timeValue);
                    break;
                case 'h':
                    expiresAt.setHours(expiresAt.getHours() + timeValue);
                    break;
                case 'm':
                    expiresAt.setMinutes(expiresAt.getMinutes() + timeValue);
                    break;
                default:
                    expiresAt.setDate(expiresAt.getDate() + 30); // Default 30 days
            }

            // Guardar refresh token en la base de datos
            await user.addRefreshToken(refreshToken, expiresAt);

            // Log de generación de tokens
            logger.info('Tokens generados exitosamente:', {
                userId,
                email: user.email,
                tokenId: refreshTokenId,
                expiresAt: expiresAt.toISOString()
            });

            return {
                accessToken,
                refreshToken,
                expiresIn: config.jwt.expiresIn || '1h',
                refreshExpiresIn: config.jwt.refreshExpiresIn || '30d'
            };

        } catch (error) {
            logger.error('Error generando tokens:', {
                error: error.message,
                userId,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Renovar access token usando refresh token
     * @param {string} refreshToken - Refresh token válido
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} - Nuevos tokens
     */
    static async refreshAccessToken(refreshToken, options = {}) {
        try {
            // Verificar y decodificar refresh token
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret, {
                issuer: 'fso-automation',
                audience: 'fso-users'
            });

            // Validar que sea un refresh token
            if (decoded.type !== 'refresh' || !decoded.tokenId) {
                throw new Error('Token inválido');
            }

            // Buscar usuario y verificar que el token existe en BD
            const user = await User.findById(decoded.id);
            if (!user || !user.active) {
                throw new Error('Usuario no válido');
            }

            // Verificar que el refresh token existe en la BD del usuario
            const tokenExists = user.refreshTokens.some(rt =>
                rt.token === refreshToken && rt.expiresAt > new Date()
            );

            if (!tokenExists) {
                // Token no encontrado o expirado - posible ataque
                logger.warn('Intento de uso de refresh token inválido:', {
                    userId: decoded.id,
                    tokenId: decoded.tokenId,
                    userEmail: user.email
                });

                // Limpiar todos los refresh tokens del usuario por seguridad
                user.refreshTokens = [];
                await user.save();

                throw new Error('Refresh token inválido o comprometido');
            }

            // Rotar tokens (generar nuevos y eliminar el usado)
            if (options.rotateToken !== false) {
                await user.removeRefreshToken(refreshToken);
            }

            // Generar nuevos tokens
            const newTokens = await this.generateTokenPair(user._id);

            logger.info('Access token renovado exitosamente:', {
                userId: user._id,
                email: user.email,
                oldTokenId: decoded.tokenId,
                rotated: options.rotateToken !== false
            });

            return newTokens;

        } catch (error) {
            logger.error('Error renovando access token:', {
                error: error.message,
                tokenError: error.name,
                stack: error.stack
            });

            // Re-throw con mensaje más específico para diferentes tipos de error
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Refresh token malformado');
            } else if (error.name === 'TokenExpiredError') {
                throw new Error('Refresh token expirado');
            } else if (error.name === 'NotBeforeError') {
                throw new Error('Refresh token no válido aún');
            }

            throw error;
        }
    }

    /**
     * Revocar refresh token específico
     * @param {string} userId - ID del usuario
     * @param {string} refreshToken - Token a revocar
     * @returns {Promise<boolean>} - true si se revocó exitosamente
     */
    static async revokeRefreshToken(userId, refreshToken) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return false;
            }

            await user.removeRefreshToken(refreshToken);

            logger.info('Refresh token revocado:', {
                userId,
                email: user.email
            });

            return true;

        } catch (error) {
            logger.error('Error revocando refresh token:', {
                error: error.message,
                userId
            });
            return false;
        }
    }

    /**
     * Revocar todos los refresh tokens de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>} - true si se revocaron exitosamente
     */
    static async revokeAllRefreshTokens(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return false;
            }

            const tokenCount = user.refreshTokens.length;
            user.refreshTokens = [];
            await user.save();

            logger.info('Todos los refresh tokens revocados:', {
                userId,
                email: user.email,
                tokenCount
            });

            return true;

        } catch (error) {
            logger.error('Error revocando todos los refresh tokens:', {
                error: error.message,
                userId
            });
            return false;
        }
    }

    /**
     * Validar access token sin renovarlo
     * @param {string} accessToken - Token a validar
     * @returns {Promise<Object>} - Payload decodificado
     */
    static async validateAccessToken(accessToken) {
        try {
            const decoded = jwt.verify(accessToken, config.jwt.secret, {
                issuer: 'fso-automation',
                audience: 'fso-users'
            });

            // Verificar que el usuario sigue activo
            const user = await User.findById(decoded.id);
            if (!user || !user.active) {
                throw new Error('Usuario no válido');
            }

            return decoded;

        } catch (error) {
            logger.debug('Access token inválido:', {
                error: error.name,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Limpiar tokens expirados de todos los usuarios (tarea de mantenimiento)
     * @returns {Promise<number>} - Número de usuarios limpiados
     */
    static async cleanupExpiredTokens() {
        try {
            const users = await User.find({
                'refreshTokens.0': { $exists: true } // Usuarios con al menos un refresh token
            });

            let cleanedCount = 0;

            for (const user of users) {
                const originalCount = user.refreshTokens.length;
                await user.cleanExpiredTokens();

                if (user.refreshTokens.length < originalCount) {
                    cleanedCount++;
                }
            }

            logger.info('Limpieza de tokens expirados completada:', {
                usersProcessed: users.length,
                usersWithCleanup: cleanedCount
            });

            return cleanedCount;

        } catch (error) {
            logger.error('Error en limpieza de tokens:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Obtener información de tokens de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} - Información de tokens
     */
    static async getTokenInfo(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            await user.cleanExpiredTokens();

            return {
                userId,
                email: user.email,
                activeTokens: user.refreshTokens.length,
                tokens: user.refreshTokens.map(rt => ({
                    createdAt: rt.createdAt,
                    expiresAt: rt.expiresAt,
                    isExpired: rt.expiresAt <= new Date()
                }))
            };

        } catch (error) {
            logger.error('Error obteniendo información de tokens:', {
                error: error.message,
                userId
            });
            throw error;
        }
    }
}

module.exports = TokenService;
