/**
 * @fileoverview Middleware para tareas de mantenimiento de tokens
 * @description Limpieza automática de tokens expirados y otras tareas de mantenimiento
 */

const cron = require('node-cron');
const TokenService = require('../services/tokenService');
const logger = require('../utils/logger');

class TokenMaintenanceMiddleware {
    /**
     * Inicializar tareas de mantenimiento
     */
    static init() {
        // Limpiar tokens expirados cada hora
        cron.schedule('0 * * * *', async () => {
            try {
                logger.info('Iniciando limpieza de tokens expirados...');
                const cleanedCount = await TokenService.cleanupExpiredTokens();
                logger.info(`Limpieza completada: ${cleanedCount} usuarios procesados`);
            } catch (error) {
                logger.error('Error en limpieza programada de tokens:', {
                    error: error.message,
                    stack: error.stack
                });
            }
        }, {
            scheduled: true,
            timezone: "America/Mexico_City"
        });

        // Limpiar tokens expirados cada 6 horas (tarea adicional más intensiva)
        cron.schedule('0 */6 * * *', async () => {
            try {
                logger.info('Iniciando limpieza intensiva de tokens...');

                // Aquí puedes agregar lógicas adicionales como:
                // - Analizar patrones de uso de tokens
                // - Detectar comportamientos sospechosos
                // - Generar reportes de seguridad

                const cleanedCount = await TokenService.cleanupExpiredTokens();
                logger.info(`Limpieza intensiva completada: ${cleanedCount} usuarios procesados`);

                // Log estadísticas de tokens activos
                await this.logTokenStatistics();

            } catch (error) {
                logger.error('Error en limpieza intensiva de tokens:', {
                    error: error.message,
                    stack: error.stack
                });
            }
        }, {
            scheduled: true,
            timezone: "America/Mexico_City"
        });

        logger.info('Tareas de mantenimiento de tokens iniciadas');
    }

    /**
     * Generar estadísticas de tokens para monitoreo
     */
    static async logTokenStatistics() {
        try {
            const { User } = require('../models');

            // Contar usuarios con tokens activos
            const usersWithTokens = await User.countDocuments({
                'refreshTokens.0': { $exists: true }
            });

            // Contar total de tokens activos
            const pipeline = [
                { $match: { 'refreshTokens.0': { $exists: true } } },
                { $project: { tokenCount: { $size: '$refreshTokens' } } },
                { $group: { _id: null, totalTokens: { $sum: '$tokenCount' } } }
            ];

            const tokenStats = await User.aggregate(pipeline);
            const totalTokens = tokenStats.length > 0 ? tokenStats[0].totalTokens : 0;

            logger.info('Estadísticas de tokens:', {
                usersWithTokens,
                totalActiveTokens: totalTokens,
                averageTokensPerUser: usersWithTokens > 0 ? (totalTokens / usersWithTokens).toFixed(2) : 0
            });

        } catch (error) {
            logger.error('Error generando estadísticas de tokens:', {
                error: error.message
            });
        }
    }

    /**
     * Middleware para limpieza manual de tokens (endpoint administrativo)
     */
    static async manualCleanup(req, res, next) {
        try {
            // Solo permitir a usuarios con rol admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: {
                        message: 'Acceso denegado',
                        type: 'FORBIDDEN',
                        code: 'ADMIN_REQUIRED'
                    }
                });
            }

            const cleanedCount = await TokenService.cleanupExpiredTokens();

            logger.info('Limpieza manual de tokens ejecutada:', {
                adminUserId: req.user.id,
                adminEmail: req.user.email,
                cleanedCount
            });

            req.cleanupResult = {
                cleanedUsers: cleanedCount,
                timestamp: new Date().toISOString()
            };

            next();

        } catch (error) {
            logger.error('Error en limpieza manual de tokens:', {
                error: error.message,
                adminUserId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: {
                    message: 'Error ejecutando limpieza de tokens',
                    type: 'INTERNAL_ERROR',
                    code: 'CLEANUP_ERROR'
                }
            });
        }
    }

    /**
     * Middleware para verificar salud del sistema de tokens
     */
    static async healthCheck(req, res, next) {
        try {
            const { User } = require('../models');

            // Verificar conexión a BD
            const userCount = await User.countDocuments();

            // Verificar tokens activos
            const usersWithTokens = await User.countDocuments({
                'refreshTokens.0': { $exists: true }
            });

            // Verificar que TokenService funciona
            const canGenerateTokens = typeof TokenService.generateTokenPair === 'function';
            const canRefreshTokens = typeof TokenService.refreshAccessToken === 'function';

            const healthStatus = {
                database: userCount >= 0,
                tokenService: canGenerateTokens && canRefreshTokens,
                activeUsers: usersWithTokens,
                totalUsers: userCount,
                timestamp: new Date().toISOString()
            };

            req.healthStatus = healthStatus;
            next();

        } catch (error) {
            logger.error('Error en health check de tokens:', {
                error: error.message
            });

            req.healthStatus = {
                database: false,
                tokenService: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };

            next();
        }
    }
}

module.exports = TokenMaintenanceMiddleware;
