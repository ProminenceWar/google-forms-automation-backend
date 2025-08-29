/**
 * @fileoverview Rutas administrativas para gestión de tokens
 * @description Endpoints para administradores para gestionar tokens del sistema
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const TokenMaintenanceMiddleware = require('../middleware/tokenMaintenance');
const TokenService = require('../services/tokenService');
const { User } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: {
                message: 'Acceso denegado. Se requiere rol de administrador.',
                type: 'FORBIDDEN',
                code: 'ADMIN_REQUIRED'
            }
        });
    }
    next();
};

/**
 * @swagger
 * /api/admin/tokens/cleanup:
 *   post:
 *     summary: Limpiar tokens expirados (Admin)
 *     description: Ejecuta limpieza manual de todos los tokens expirados del sistema
 *     tags: [Administración - Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpieza ejecutada exitosamente
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
 *                     cleanedUsers:
 *                       type: number
 *                       example: 15
 *                     timestamp:
 *                       type: string
 *                       example: "2024-01-15T10:30:00.000Z"
 *       403:
 *         description: Acceso denegado
 */
router.post('/cleanup',
    authenticateToken,
    requireAdmin,
    TokenMaintenanceMiddleware.manualCleanup,
    (req, res) => {
        res.status(200).json({
            success: true,
            data: req.cleanupResult,
            message: `Limpieza completada. ${req.cleanupResult.cleanedUsers} usuarios procesados.`
        });
    }
);

/**
 * @swagger
 * /api/admin/tokens/health:
 *   get:
 *     summary: Estado de salud del sistema de tokens (Admin)
 *     description: Verifica el estado del sistema de tokens y base de datos
 *     tags: [Administración - Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de salud obtenido
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
 *                     database:
 *                       type: boolean
 *                     tokenService:
 *                       type: boolean
 *                     activeUsers:
 *                       type: number
 *                     totalUsers:
 *                       type: number
 *                     timestamp:
 *                       type: string
 */
router.get('/health',
    authenticateToken,
    requireAdmin,
    TokenMaintenanceMiddleware.healthCheck,
    (req, res) => {
        const isHealthy = req.healthStatus.database && req.healthStatus.tokenService;

        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            data: req.healthStatus,
            message: isHealthy ? 'Sistema de tokens saludable' : 'Problemas detectados en el sistema de tokens'
        });
    }
);

/**
 * @swagger
 * /api/admin/tokens/statistics:
 *   get:
 *     summary: Estadísticas detalladas de tokens (Admin)
 *     description: Obtiene estadísticas completas del uso de tokens en el sistema
 *     tags: [Administración - Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/statistics', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Estadísticas básicas
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ active: true });
        const usersWithTokens = await User.countDocuments({
            'refreshTokens.0': { $exists: true }
        });

        // Estadísticas de tokens por usuario
        const tokenDistribution = await User.aggregate([
            { $match: { 'refreshTokens.0': { $exists: true } } },
            { $project: { tokenCount: { $size: '$refreshTokens' } } },
            {
                $group: {
                    _id: '$tokenCount',
                    userCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total de tokens activos
        const totalTokensResult = await User.aggregate([
            { $match: { 'refreshTokens.0': { $exists: true } } },
            { $project: { tokenCount: { $size: '$refreshTokens' } } },
            { $group: { _id: null, totalTokens: { $sum: '$tokenCount' } } }
        ]);
        const totalTokens = totalTokensResult.length > 0 ? totalTokensResult[0].totalTokens : 0;

        // Tokens por rol
        const tokensByRole = await User.aggregate([
            { $match: { 'refreshTokens.0': { $exists: true } } },
            {
                $group: {
                    _id: '$role',
                    userCount: { $sum: 1 },
                    totalTokens: { $sum: { $size: '$refreshTokens' } }
                }
            },
            { $sort: { userCount: -1 } }
        ]);

        // Tokens por empresa
        const tokensByCompany = await User.aggregate([
            { $match: { 'refreshTokens.0': { $exists: true } } },
            {
                $group: {
                    _id: '$company',
                    userCount: { $sum: 1 },
                    totalTokens: { $sum: { $size: '$refreshTokens' } }
                }
            },
            { $sort: { userCount: -1 } },
            { $limit: 10 }
        ]);

        // Tokens próximos a expirar (próximas 24 horas)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const expiringTokens = await User.aggregate([
            { $match: { 'refreshTokens.0': { $exists: true } } },
            {
                $project: {
                    email: 1,
                    expiringTokens: {
                        $filter: {
                            input: '$refreshTokens',
                            cond: {
                                $and: [
                                    { $gt: ['$$this.expiresAt', new Date()] },
                                    { $lte: ['$$this.expiresAt', tomorrow] }
                                ]
                            }
                        }
                    }
                }
            },
            { $match: { 'expiringTokens.0': { $exists: true } } },
            {
                $project: {
                    email: 1,
                    expiringCount: { $size: '$expiringTokens' }
                }
            }
        ]);

        const statistics = {
            overview: {
                totalUsers,
                activeUsers,
                usersWithTokens,
                totalActiveTokens: totalTokens,
                averageTokensPerUser: usersWithTokens > 0 ? (totalTokens / usersWithTokens).toFixed(2) : 0
            },
            distribution: {
                tokenCountDistribution: tokenDistribution,
                tokensByRole,
                tokensByCompany
            },
            expiration: {
                tokensExpiringIn24h: expiringTokens.length,
                usersWithExpiringTokens: expiringTokens
            },
            timestamp: new Date().toISOString()
        };

        logger.info('Estadísticas de tokens consultadas:', {
            adminUserId: req.user.id,
            adminEmail: req.user.email
        });

        res.status(200).json({
            success: true,
            data: statistics,
            message: 'Estadísticas de tokens obtenidas exitosamente'
        });

    } catch (error) {
        logger.error('Error obteniendo estadísticas de tokens:', {
            error: error.message,
            stack: error.stack,
            adminUserId: req.user.id
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error obteniendo estadísticas de tokens',
                type: 'INTERNAL_ERROR',
                code: 'STATISTICS_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/admin/tokens/user/{userId}:
 *   get:
 *     summary: Tokens de usuario específico (Admin)
 *     description: Obtiene información detallada de tokens de un usuario específico
 *     tags: [Administración - Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Información de tokens del usuario
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const tokenInfo = await TokenService.getTokenInfo(userId);

        logger.info('Información de tokens de usuario consultada:', {
            adminUserId: req.user.id,
            adminEmail: req.user.email,
            targetUserId: userId
        });

        res.status(200).json({
            success: true,
            data: tokenInfo,
            message: 'Información de tokens obtenida exitosamente'
        });

    } catch (error) {
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Usuario no encontrado',
                    type: 'NOT_FOUND',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        logger.error('Error obteniendo tokens de usuario:', {
            error: error.message,
            adminUserId: req.user.id,
            targetUserId: req.params.userId
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error obteniendo información de tokens',
                type: 'INTERNAL_ERROR',
                code: 'USER_TOKENS_ERROR'
            }
        });
    }
});

/**
 * @swagger
 * /api/admin/tokens/revoke/{userId}:
 *   post:
 *     summary: Revocar todos los tokens de un usuario (Admin)
 *     description: Revoca todos los refresh tokens de un usuario específico
 *     tags: [Administración - Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Tokens revocados exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/revoke/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Usuario no encontrado',
                    type: 'NOT_FOUND',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        // Contar tokens antes de revocar
        const tokenCount = user.refreshTokens.length;

        // Revocar todos los tokens
        const revoked = await TokenService.revokeAllRefreshTokens(userId);

        if (!revoked) {
            return res.status(500).json({
                success: false,
                error: {
                    message: 'No se pudieron revocar los tokens',
                    type: 'REVOKE_ERROR',
                    code: 'REVOKE_FAILED'
                }
            });
        }

        logger.warn('Tokens revocados por administrador:', {
            adminUserId: req.user.id,
            adminEmail: req.user.email,
            targetUserId: userId,
            targetUserEmail: user.email,
            revokedTokens: tokenCount
        });

        res.status(200).json({
            success: true,
            data: {
                userId,
                userEmail: user.email,
                revokedTokens: tokenCount,
                timestamp: new Date().toISOString()
            },
            message: `${tokenCount} tokens revocados exitosamente para el usuario ${user.email}`
        });

    } catch (error) {
        logger.error('Error revocando tokens de usuario:', {
            error: error.message,
            adminUserId: req.user.id,
            targetUserId: req.params.userId
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error revocando tokens del usuario',
                type: 'INTERNAL_ERROR',
                code: 'ADMIN_REVOKE_ERROR'
            }
        });
    }
});

module.exports = router;
