/**
 * @fileoverview Rutas para estadísticas de formularios FSO
 * @description Endpoints específicos para estadísticas y reportes de FSO
 */

const express = require('express');
const { FSOForm } = require('../models');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/v1/fso/stats:
 *   get:
 *     summary: Obtener estadísticas de formularios FSO
 *     description: Retorna estadísticas detalladas y métricas de los formularios FSO con distribuciones por estado, tipo, compañía y técnico
 *     tags: [Estadísticas FSO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *           example: month
 *         description: Período de tiempo para las estadísticas
 *         required: false
 *       - in: query
 *         name: tipoFSO
 *         schema:
 *           type: string
 *           enum: [instalaciones, tickets_averia, retiro, traslados, reubicaciones, cambio_equipo, inspeccion]
 *           example: instalaciones
 *         description: Filtrar por tipo de FSO específico (opcional)
 *         required: false
 *       - in: query
 *         name: companiaInspeccion
 *         schema:
 *           type: string
 *           example: TecNetwork Solutions
 *         description: Filtrar por compañía de inspección (búsqueda parcial, opcional)
 *         required: false
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
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
 *                   example: "Estadísticas de formularios FSO obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 15
 *                         completados:
 *                           type: integer
 *                           example: 8
 *                         pendientes:
 *                           type: integer
 *                           example: 7
 *                         completionRate:
 *                           type: number
 *                           example: 53.33
 *                         avgScore:
 *                           type: number
 *                           example: 7.2
 *                     distributions:
 *                       type: object
 *                       properties:
 *                         byStatus:
 *                           type: array
 *                         byType:
 *                           type: array
 *                         byCompany:
 *                           type: array
 *                         byTechnician:
 *                           type: array
 *       401:
 *         description: Token de acceso requerido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Token de acceso requerido"
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats',
    authenticateToken,
    async (req, res) => {
        try {
            const {
                period = 'month',
                tipoFSO,
                companiaInspeccion
            } = req.query;

            // Calcular rango de fechas según el período
            const now = new Date();
            let startDate;

            switch (period) {
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'year':
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                case 'all':
                    startDate = new Date('2020-01-01');
                    break;
                default: // month
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            // Construir filtros
            const matchFilter = {
                createdAt: { $gte: startDate, $lte: now }
            };

            if (tipoFSO) {
                matchFilter.tipoFSO = tipoFSO;
            }

            if (companiaInspeccion) {
                matchFilter.companiaInspeccion = new RegExp(companiaInspeccion, 'i');
            }

            // Ejecutar agregaciones en paralelo
            const [
                generalStats,
                statusDistribution,
                typeDistribution,
                companyDistribution,
                technicianStats,
                averageScores
            ] = await Promise.all([
                // Estadísticas generales
                FSOForm.aggregate([
                    { $match: matchFilter },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            avgScore: { $avg: '$puntuacionCalculada' },
                            maxScore: { $max: '$puntuacionCalculada' },
                            minScore: { $min: '$puntuacionCalculada' },
                            completados: {
                                $sum: { $cond: [{ $eq: ['$estado', 'completado'] }, 1, 0] }
                            },
                            pendientes: {
                                $sum: { $cond: [{ $eq: ['$estado', 'pendiente'] }, 1, 0] }
                            }
                        }
                    }
                ]),

                // Distribución por estado
                FSOForm.aggregate([
                    { $match: matchFilter },
                    { $group: { _id: '$estado', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),

                // Distribución por tipo
                FSOForm.aggregate([
                    { $match: matchFilter },
                    { $group: { _id: '$tipoFSO', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),

                // Distribución por compañía (top 10)
                FSOForm.aggregate([
                    { $match: matchFilter },
                    {
                        $group: {
                            _id: '$companiaInspeccion',
                            count: { $sum: 1 },
                            avgScore: { $avg: '$puntuacionCalculada' }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]),

                // Estadísticas por técnico (top 10)
                FSOForm.aggregate([
                    { $match: matchFilter },
                    {
                        $group: {
                            _id: '$nombreTecnico',
                            count: { $sum: 1 },
                            avgScore: { $avg: '$puntuacionCalculada' }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]),

                // Distribución de puntuaciones
                FSOForm.aggregate([
                    { $match: { ...matchFilter, puntuacionCalculada: { $exists: true, $ne: null } } },
                    {
                        $bucket: {
                            groupBy: '$puntuacionCalculada',
                            boundaries: [0, 2, 4, 6, 8, 10],
                            default: 'other',
                            output: { count: { $sum: 1 } }
                        }
                    }
                ])
            ]);

            // Procesar estadísticas generales
            const stats = generalStats[0] || {
                total: 0,
                avgScore: 0,
                maxScore: 0,
                minScore: 0,
                completados: 0,
                pendientes: 0
            };

            const completionRate = stats.total > 0 ? (stats.completados / stats.total) * 100 : 0;

            // Log de actividad
            logger.info('Estadísticas FSO obtenidas exitosamente:', {
                userId: req.user.id,
                userRole: req.user.role,
                period,
                filters: { tipoFSO, companiaInspeccion },
                totalForms: stats.total,
                timestamp: new Date().toISOString()
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Estadísticas de formularios FSO obtenidas exitosamente',
                data: {
                    summary: {
                        total: stats.total,
                        completados: stats.completados,
                        pendientes: stats.pendientes,
                        completionRate: Math.round(completionRate * 100) / 100,
                        avgScore: Math.round((stats.avgScore || 0) * 100) / 100,
                        maxScore: stats.maxScore || 0,
                        minScore: stats.minScore || 0
                    },
                    distributions: {
                        byStatus: statusDistribution,
                        byType: typeDistribution,
                        byCompany: companyDistribution,
                        byTechnician: technicianStats,
                        byScore: averageScores
                    },
                    period: {
                        type: period,
                        startDate: startDate.toISOString(),
                        endDate: now.toISOString()
                    },
                    filters: {
                        tipoFSO: tipoFSO || null,
                        companiaInspeccion: companiaInspeccion || null
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al obtener estadísticas FSO:', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                query: req.query,
                timestamp: new Date().toISOString()
            });

            res.status(500).json({
                success: false,
                error: {
                    message: 'Error interno del servidor al obtener estadísticas',
                    type: 'STATS_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                timestamp: new Date().toISOString()
            });
        }
    });

/**
 * @swagger
 * /api/v1/fso/export:
 *   get:
 *     summary: Exportar formularios FSO para análisis
 *     description: Obtiene formularios FSO para exportación con filtros avanzados. Solo disponible para administradores y supervisores.
 *     tags: [Estadísticas FSO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendiente, en_progreso, completado, rechazado]
 *           example: completado
 *         description: Filtrar por estado específico (opcional)
 *         required: false
 *       - in: query
 *         name: tipoFSO
 *         schema:
 *           type: string
 *           enum: [instalaciones, tickets_averia, retiro, traslados, reubicaciones, cambio_equipo, inspeccion]
 *           example: instalaciones
 *         description: Filtrar por tipo de FSO específico (opcional)
 *         required: false
 *       - in: query
 *         name: companiaInspeccion
 *         schema:
 *           type: string
 *           example: TecNetwork
 *         description: Filtrar por compañía de inspección (búsqueda parcial, opcional)
 *         required: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *           example: 100
 *         description: Límite de registros a exportar (máximo 1000)
 *         required: false
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [full, summary]
 *           default: summary
 *           example: summary
 *         description: Formato de datos - 'summary' para campos básicos, 'full' para todos los campos
 *         required: false
 *     responses:
 *       200:
 *         description: Formularios exportados exitosamente
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
 *                   example: "Formularios FSO exportados exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     forms:
 *                       type: array
 *                       description: Array de formularios FSO
 *                     export:
 *                       type: object
 *                       properties:
 *                         totalRecords:
 *                           type: integer
 *                           example: 50
 *                         format:
 *                           type: string
 *                           example: "summary"
 *                         exportedAt:
 *                           type: string
 *                           format: date-time
 *                         exportedBy:
 *                           type: string
 *                           example: "user123"
 *       401:
 *         description: Token de acceso requerido
 *       403:
 *         description: Permisos insuficientes - Solo administradores y supervisores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Permisos insuficientes"
 *       500:
 *         description: Error interno del servidor
 */
router.get('/export',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    async (req, res) => {
        try {
            const {
                status,
                tipoFSO,
                companiaInspeccion,
                limit = 500,
                format = 'summary'
            } = req.query;

            // Construir filtros
            const searchFilter = {};
            if (status) searchFilter.estado = status;
            if (tipoFSO) searchFilter.tipoFSO = tipoFSO;
            if (companiaInspeccion) {
                searchFilter.companiaInspeccion = { $regex: companiaInspeccion, $options: 'i' };
            }

            // Configurar proyección según el formato
            let projection = {};
            if (format === 'summary') {
                projection = {
                    _id: 1,
                    formId: 1,
                    email: 1,
                    numeroOrden: 1,
                    tipoFSO: 1,
                    companiaInspeccion: 1,
                    nombreTecnico: 1,
                    estado: 1,
                    puntuacionCalculada: 1,
                    'datosCliente.nombreCliente': 1,
                    'cliente.nombreCliente': 1,
                    createdAt: 1,
                    updatedAt: 1
                };
            }

            const exportLimit = Math.min(parseInt(limit), 1000);

            // Obtener datos
            const [formsList, totalCount] = await Promise.all([
                FSOForm.find(searchFilter, projection)
                    .sort({ createdAt: -1 })
                    .limit(exportLimit)
                    .lean(),
                FSOForm.countDocuments(searchFilter)
            ]);

            // Log de actividad
            logger.info('Exportación de formularios FSO realizada:', {
                userId: req.user.id,
                userRole: req.user.role,
                totalFound: formsList.length,
                totalInDB: totalCount,
                format,
                filters: { status, tipoFSO, companiaInspeccion },
                timestamp: new Date().toISOString()
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Formularios FSO exportados exitosamente',
                data: {
                    forms: formsList,
                    export: {
                        format,
                        totalRecords: formsList.length,
                        totalAvailable: totalCount,
                        limitApplied: exportLimit,
                        truncated: totalCount > exportLimit,
                        exportedAt: new Date().toISOString(),
                        exportedBy: req.user.id,
                        filters: {
                            status: status || null,
                            tipoFSO: tipoFSO || null,
                            companiaInspeccion: companiaInspeccion || null
                        }
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al exportar formularios FSO:', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                query: req.query,
                timestamp: new Date().toISOString()
            });

            res.status(500).json({
                success: false,
                error: {
                    message: 'Error interno del servidor al exportar formularios',
                    type: 'EXPORT_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                timestamp: new Date().toISOString()
            });
        }
    });

/**
 * @swagger
 * /api/v1/fso/summary:
 *   get:
 *     summary: Resumen ejecutivo de formularios FSO
 *     description: Obtiene un resumen ejecutivo con KPIs principales y métricas clave para dashboards
 *     tags: [Estadísticas FSO]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen ejecutivo obtenido exitosamente
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
 *                   example: "Resumen ejecutivo obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     kpis:
 *                       type: object
 *                       properties:
 *                         totalForms:
 *                           type: integer
 *                           example: 25
 *                           description: Total de formularios FSO en el sistema
 *                         completedForms:
 *                           type: integer
 *                           example: 18
 *                           description: Formularios completados
 *                         pendingForms:
 *                           type: integer
 *                           example: 7
 *                           description: Formularios pendientes
 *                         completionRate:
 *                           type: number
 *                           example: 72.0
 *                           description: Porcentaje de formularios completados
 *                         averageScore:
 *                           type: number
 *                           example: 8.5
 *                           description: Puntuación promedio de los formularios
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-29T00:15:30.123Z"
 *                       description: Fecha y hora de generación del resumen
 *       401:
 *         description: Token de acceso requerido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Token de acceso requerido"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Error interno del servidor"
 *                     type:
 *                       type: string
 *                       example: "SUMMARY_ERROR"
 */
router.get('/summary',
    authenticateToken,
    async (req, res) => {
        try {
            // Obtener estadísticas generales
            const [totalForms, completedForms, pendingForms, avgScore] = await Promise.all([
                FSOForm.countDocuments(),
                FSOForm.countDocuments({ estado: 'completado' }),
                FSOForm.countDocuments({ estado: 'pendiente' }),
                FSOForm.aggregate([
                    { $match: { puntuacionCalculada: { $exists: true, $ne: null } } },
                    { $group: { _id: null, avgScore: { $avg: '$puntuacionCalculada' } } }
                ])
            ]);

            const averageScore = avgScore[0]?.avgScore || 0;
            const completionRate = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

            // Respuesta
            res.status(200).json({
                success: true,
                message: 'Resumen ejecutivo obtenido exitosamente',
                data: {
                    kpis: {
                        totalForms,
                        completedForms,
                        pendingForms,
                        completionRate: Math.round(completionRate * 100) / 100,
                        averageScore: Math.round(averageScore * 100) / 100
                    },
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Error al obtener resumen FSO:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Error interno del servidor', type: 'SUMMARY_ERROR' }
            });
        }
    });

module.exports = router;
