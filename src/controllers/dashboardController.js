/**
 * @fileoverview Controlador del Dashboard Administrativo
 * @description Maneja métricas, estadísticas y funcionalidades administrativas
 */

const { FSOForm, User, File } = require('../models');
const logger = require('../utils/logger');

/**
 * Obtener estadísticas generales del dashboard
 */
const getDashboardStats = async (req, res) => {
    try {
        const { timeRange = '30d', timezone = 'UTC' } = req.query;

        // Calcular fecha de inicio basada en el rango
        const now = new Date();
        let startDate;

        switch (timeRange) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Ejecutar todas las consultas en paralelo para optimizar rendimiento
        const [
            totalForms,
            formsInRange,
            statusStats,
            typeStats,
            companyStats,
            technicianStats,
            dailyStats,
            averageScore,
            recentActivity,
            fileStats,
            userStats
        ] = await Promise.all([
            // Total de formularios
            FSOForm.countDocuments(),

            // Formularios en el rango de tiempo
            FSOForm.countDocuments({
                fechaCreacion: { $gte: startDate, $lte: now }
            }),

            // Estadísticas por estado
            FSOForm.aggregate([
                { $group: { _id: '$estado', count: { $sum: 1 } } }
            ]),

            // Estadísticas por tipo FSO
            FSOForm.aggregate([
                { $group: { _id: '$tipoFSO', count: { $sum: 1 } } }
            ]),

            // Estadísticas por compañía
            FSOForm.aggregate([
                { $group: { _id: '$companiaInspeccion', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // Estadísticas por técnico
            FSOForm.aggregate([
                { $group: { _id: '$nombreTecnico', count: { $sum: 1 }, avgScore: { $avg: '$puntajeTotal' } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // Estadísticas diarias
            FSOForm.aggregate([
                {
                    $match: {
                        fechaCreacion: { $gte: startDate, $lte: now }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$fechaCreacion' },
                            month: { $month: '$fechaCreacion' },
                            day: { $dayOfMonth: '$fechaCreacion' }
                        },
                        count: { $sum: 1 },
                        avgScore: { $avg: '$puntajeTotal' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]),

            // Puntaje promedio
            FSOForm.aggregate([
                { $group: { _id: null, avgScore: { $avg: '$puntajeTotal' } } }
            ]),

            // Actividad reciente
            FSOForm.find({
                fechaActualizacion: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            })
                .sort({ fechaActualizacion: -1 })
                .limit(20)
                .select('formId numeroOrden estado tipoFSO fechaActualizacion modificadoPor')
                .lean(),

            // Estadísticas de archivos
            File.aggregate([
                {
                    $group: {
                        _id: null,
                        totalFiles: { $sum: 1 },
                        totalSize: { $sum: '$size' },
                        avgSize: { $avg: '$size' }
                    }
                }
            ]),

            // Estadísticas de usuarios
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ])
        ]);

        // Formatear estadísticas de estado
        const formattedStatusStats = {
            pendiente: 0,
            en_progreso: 0,
            completado: 0,
            rechazado: 0
        };

        statusStats.forEach(stat => {
            if (stat._id && formattedStatusStats.hasOwnProperty(stat._id)) {
                formattedStatusStats[stat._id] = stat.count;
            }
        });

        // Formatear estadísticas de tipo
        const formattedTypeStats = {
            inspeccion_inicial: 0,
            seguimiento: 0,
            reinspeccion: 0
        };

        typeStats.forEach(stat => {
            if (stat._id && formattedTypeStats.hasOwnProperty(stat._id)) {
                formattedTypeStats[stat._id] = stat.count;
            }
        });

        // Formatear estadísticas de usuarios
        const formattedUserStats = {
            tecnico: 0,
            supervisor: 0,
            admin: 0
        };

        userStats.forEach(stat => {
            if (stat._id && formattedUserStats.hasOwnProperty(stat._id)) {
                formattedUserStats[stat._id] = stat.count;
            }
        });

        // Calcular métricas de rendimiento
        const completionRate = totalForms > 0
            ? (formattedStatusStats.completado / totalForms) * 100
            : 0;

        const avgScoreValue = averageScore.length > 0 ? averageScore[0].avgScore : 0;

        const growthRate = totalForms > formsInRange
            ? ((formsInRange / (totalForms - formsInRange)) * 100)
            : 0;

        // Preparar respuesta
        const dashboardData = {
            summary: {
                totalForms,
                formsInRange,
                completionRate: Math.round(completionRate * 100) / 100,
                averageScore: Math.round(avgScoreValue * 100) / 100,
                growthRate: Math.round(growthRate * 100) / 100
            },
            statusDistribution: formattedStatusStats,
            typeDistribution: formattedTypeStats,
            topCompanies: companyStats.slice(0, 5),
            topTechnicians: technicianStats.slice(0, 5),
            dailyTrends: dailyStats,
            recentActivity,
            fileStatistics: fileStats.length > 0 ? {
                totalFiles: fileStats[0].totalFiles,
                totalSize: fileStats[0].totalSize,
                averageSize: Math.round(fileStats[0].avgSize)
            } : {
                totalFiles: 0,
                totalSize: 0,
                averageSize: 0
            },
            userDistribution: formattedUserStats,
            metadata: {
                timeRange,
                startDate,
                endDate: now,
                timezone,
                lastUpdated: new Date()
            }
        };

        // Log de actividad
        logger.info('Dashboard estadísticas obtenidas:', {
            userId: req.user.id,
            userRole: req.user.role,
            timeRange,
            totalForms,
            formsInRange
        });

        res.status(200).json({
            success: true,
            message: 'Estadísticas del dashboard obtenidas exitosamente',
            data: dashboardData
        });

    } catch (error) {
        logger.error('Error al obtener estadísticas del dashboard:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
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
 * Obtener métricas de rendimiento
 */
const getPerformanceMetrics = async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        // Calcular período
        const now = new Date();
        const startDate = new Date(now.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));

        // Métricas de rendimiento
        const [
            avgCompletionTime,
            formsByHour,
            errorRates,
            userActivity
        ] = await Promise.all([
            // Tiempo promedio de completado
            FSOForm.aggregate([
                {
                    $match: {
                        estado: 'completado',
                        fechaCreacion: { $gte: startDate }
                    }
                },
                {
                    $project: {
                        completionTime: {
                            $subtract: ['$fechaActualizacion', '$fechaCreacion']
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$completionTime' },
                        minTime: { $min: '$completionTime' },
                        maxTime: { $max: '$completionTime' }
                    }
                }
            ]),

            // Formularios por hora del día
            FSOForm.aggregate([
                {
                    $match: {
                        fechaCreacion: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $hour: '$fechaCreacion' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id': 1 } }
            ]),

            // Simulación de tasas de error (en una implementación real sería desde logs)
            Promise.resolve([
                { hour: 0, errorRate: 0.01 },
                { hour: 6, errorRate: 0.005 },
                { hour: 12, errorRate: 0.02 },
                { hour: 18, errorRate: 0.015 }
            ]),

            // Actividad de usuarios
            FSOForm.aggregate([
                {
                    $match: {
                        fechaCreacion: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$creadoPor',
                        formsCreated: { $sum: 1 },
                        lastActivity: { $max: '$fechaActualizacion' }
                    }
                },
                { $sort: { formsCreated: -1 } },
                { $limit: 10 }
            ])
        ]);

        // Formatear tiempos
        const performanceData = {
            completionTime: avgCompletionTime.length > 0 ? {
                average: Math.round(avgCompletionTime[0].avgTime / (1000 * 60 * 60)), // horas
                minimum: Math.round(avgCompletionTime[0].minTime / (1000 * 60 * 60)),
                maximum: Math.round(avgCompletionTime[0].maxTime / (1000 * 60 * 60))
            } : {
                average: 0,
                minimum: 0,
                maximum: 0
            },
            hourlyDistribution: formsByHour,
            errorRates,
            activeUsers: userActivity,
            systemHealth: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version
            }
        };

        logger.info('Métricas de rendimiento obtenidas:', {
            userId: req.user.id,
            period,
            metricsCount: Object.keys(performanceData).length
        });

        res.status(200).json({
            success: true,
            message: 'Métricas de rendimiento obtenidas exitosamente',
            data: performanceData
        });

    } catch (error) {
        logger.error('Error al obtener métricas de rendimiento:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
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

module.exports = {
    getDashboardStats,
    getPerformanceMetrics
};
