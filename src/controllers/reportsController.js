/**
 * @fileoverview Controlador de Reportes PDF
 * @description Maneja la generación de reportes en formato PDF
 */

const { FSOForm, User, File } = require('../models');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generar reporte general de formularios en PDF
 */
const generateFormsReport = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            status,
            tipoFSO,
            companiaInspeccion,
            includeDetails = 'true'
        } = req.query;

        // Construir filtros
        const filters = {};

        if (startDate || endDate) {
            filters.fechaCreacion = {};
            if (startDate) filters.fechaCreacion.$gte = new Date(startDate);
            if (endDate) filters.fechaCreacion.$lte = new Date(endDate);
        }

        if (status) filters.estado = status;
        if (tipoFSO) filters.tipoFSO = tipoFSO;
        if (companiaInspeccion) filters.companiaInspeccion = companiaInspeccion;

        // Obtener datos
        const [forms, statusStats, typeStats] = await Promise.all([
            FSOForm.find(filters)
                .sort({ fechaCreacion: -1 })
                .limit(100) // Limitar para evitar PDFs muy grandes
                .lean(),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$estado', count: { $sum: 1 } } }
            ]),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$tipoFSO', count: { $sum: 1 } } }
            ])
        ]);

        // Crear documento PDF
        const doc = new PDFDocument({ margin: 50 });

        // Configurar headers de respuesta
        const filename = `reporte_formularios_${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe del documento a la respuesta
        doc.pipe(res);

        // Título del reporte
        doc.fontSize(20)
            .text('Reporte de Formularios FSO', { align: 'center' })
            .moveDown();

        // Información general
        doc.fontSize(12)
            .text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`)
            .text(`Generado por: ${req.user.name || req.user.email}`)
            .text(`Total de registros: ${forms.length}`)
            .moveDown();

        // Filtros aplicados
        if (Object.keys(filters).length > 0) {
            doc.fontSize(14)
                .text('Filtros Aplicados:', { underline: true })
                .fontSize(10);

            if (startDate) doc.text(`Fecha inicio: ${new Date(startDate).toLocaleDateString('es-ES')}`);
            if (endDate) doc.text(`Fecha fin: ${new Date(endDate).toLocaleDateString('es-ES')}`);
            if (status) doc.text(`Estado: ${status}`);
            if (tipoFSO) doc.text(`Tipo FSO: ${tipoFSO}`);
            if (companiaInspeccion) doc.text(`Compañía: ${companiaInspeccion}`);

            doc.moveDown();
        }

        // Estadísticas
        if (statusStats.length > 0) {
            doc.fontSize(14)
                .text('Distribución por Estado:', { underline: true })
                .fontSize(10);

            statusStats.forEach(stat => {
                doc.text(`${stat._id}: ${stat.count} formularios`);
            });

            doc.moveDown();
        }

        if (typeStats.length > 0) {
            doc.fontSize(14)
                .text('Distribución por Tipo FSO:', { underline: true })
                .fontSize(10);

            typeStats.forEach(stat => {
                doc.text(`${stat._id}: ${stat.count} formularios`);
            });

            doc.moveDown();
        }

        // Lista de formularios
        if (includeDetails === 'true' && forms.length > 0) {
            doc.fontSize(14)
                .text('Detalle de Formularios:', { underline: true })
                .moveDown();

            forms.forEach((form, index) => {
                // Verificar si necesitamos nueva página
                if (doc.y > 700) {
                    doc.addPage();
                }

                doc.fontSize(10)
                    .text(`${index + 1}. Formulario ${form.formId || 'N/A'}`, { underline: true })
                    .text(`   Número de Orden: ${form.numeroOrden || 'N/A'}`)
                    .text(`   Email: ${form.email || 'N/A'}`)
                    .text(`   Tipo FSO: ${form.tipoFSO || 'N/A'}`)
                    .text(`   Compañía: ${form.companiaInspeccion || 'N/A'}`)
                    .text(`   Técnico: ${form.nombreTecnico || 'N/A'}`)
                    .text(`   Estado: ${form.estado || 'N/A'}`)
                    .text(`   Puntaje: ${form.puntajeTotal || 0}/100`)
                    .text(`   Fecha Creación: ${form.fechaCreacion ? form.fechaCreacion.toLocaleDateString('es-ES') : 'N/A'}`)
                    .moveDown(0.5);
            });
        }

        // Pie de página en cada página
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);

            doc.fontSize(8)
                .text(
                    `Página ${i + 1} de ${pages.count} - FSO Automation System`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );
        }

        // Finalizar documento
        doc.end();

        // Log de actividad
        logger.info('Reporte PDF generado:', {
            userId: req.user.id,
            totalRecords: forms.length,
            filters,
            filename,
            includeDetails
        });

    } catch (error) {
        logger.error('Error al generar reporte PDF:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });

        // Si el documento ya se está enviando, no podemos enviar un JSON
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: {
                    message: 'Error al generar reporte PDF',
                    type: 'REPORT_ERROR'
                }
            });
        }
    }
};

/**
 * Generar reporte estadístico en PDF
 */
const generateStatsReport = async (req, res) => {
    try {
        const { period = '30', includeCharts = 'true' } = req.query;

        // Calcular rango de fechas basado en el período
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(period));

        const filters = {
            fechaCreacion: {
                $gte: startDate,
                $lte: endDate
            }
        };

        // Obtener estadísticas completas
        const [
            totalForms,
            statusStats,
            typeStats,
            companyStats,
            dailyStats,
            averageScore
        ] = await Promise.all([
            FSOForm.countDocuments(filters),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$estado', count: { $sum: 1 } } }
            ]),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$tipoFSO', count: { $sum: 1 } } }
            ]),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$companiaInspeccion', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            FSOForm.aggregate([
                { $match: filters },
                {
                    $group: {
                        _id: {
                            day: { $dayOfMonth: '$fechaCreacion' },
                            month: { $month: '$fechaCreacion' },
                            year: { $year: '$fechaCreacion' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: null, avgScore: { $avg: '$puntajeTotal' } } }
            ])
        ]);

        // Crear documento PDF
        const doc = new PDFDocument({ margin: 50 });

        // Configurar headers de respuesta
        const filename = `reporte_estadisticas_${period}dias_${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe del documento a la respuesta
        doc.pipe(res);

        // Título del reporte
        doc.fontSize(20)
            .text('Reporte Estadístico FSO', { align: 'center' })
            .moveDown();

        // Información general
        doc.fontSize(12)
            .text(`Período: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`)
            .text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`)
            .text(`Generado por: ${req.user.name || req.user.email}`)
            .moveDown();

        // Métricas principales
        doc.fontSize(16)
            .text('Métricas Principales', { underline: true })
            .fontSize(12)
            .moveDown(0.5);

        const avgScoreValue = averageScore[0]?.avgScore || 0;

        doc.text(`Total de Formularios: ${totalForms}`)
            .text(`Puntaje Promedio: ${avgScoreValue.toFixed(2)}/100`)
            .text(`Formularios por Día: ${(totalForms / parseInt(period)).toFixed(1)}`)
            .moveDown();

        // Distribución por estado
        if (statusStats.length > 0) {
            doc.fontSize(14)
                .text('Distribución por Estado:', { underline: true })
                .fontSize(10)
                .moveDown(0.3);

            statusStats.forEach(stat => {
                const percentage = ((stat.count / totalForms) * 100).toFixed(1);
                doc.text(`${stat._id}: ${stat.count} (${percentage}%)`);
            });

            doc.moveDown();
        }

        // Distribución por tipo FSO
        if (typeStats.length > 0) {
            doc.fontSize(14)
                .text('Distribución por Tipo FSO:', { underline: true })
                .fontSize(10)
                .moveDown(0.3);

            typeStats.forEach(stat => {
                const percentage = ((stat.count / totalForms) * 100).toFixed(1);
                doc.text(`${stat._id}: ${stat.count} (${percentage}%)`);
            });

            doc.moveDown();
        }

        // Top compañías
        if (companyStats.length > 0) {
            doc.fontSize(14)
                .text('Top 10 Compañías de Inspección:', { underline: true })
                .fontSize(10)
                .moveDown(0.3);

            companyStats.forEach((stat, index) => {
                doc.text(`${index + 1}. ${stat._id}: ${stat.count} formularios`);
            });

            doc.moveDown();
        }

        // Actividad diaria
        if (dailyStats.length > 0) {
            doc.fontSize(14)
                .text('Actividad Diaria:', { underline: true })
                .fontSize(10)
                .moveDown(0.3);

            // Mostrar solo los últimos 10 días para no sobrecargar
            const recentStats = dailyStats.slice(-10);

            recentStats.forEach(stat => {
                const dateStr = `${stat._id.day}/${stat._id.month}/${stat._id.year}`;
                doc.text(`${dateStr}: ${stat.count} formularios`);
            });
        }

        // Análisis y conclusiones
        doc.addPage()
            .fontSize(16)
            .text('Análisis y Conclusiones', { underline: true })
            .fontSize(12)
            .moveDown();

        // Generar conclusiones automáticas basadas en los datos
        const conclusions = generateConclusions(totalForms, statusStats, avgScoreValue, period);

        conclusions.forEach(conclusion => {
            doc.text(`• ${conclusion}`)
                .moveDown(0.3);
        });

        // Pie de página
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);

            doc.fontSize(8)
                .text(
                    `Página ${i + 1} de ${pages.count} - FSO Automation System`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );
        }

        // Finalizar documento
        doc.end();

        // Log de actividad
        logger.info('Reporte estadístico PDF generado:', {
            userId: req.user.id,
            period,
            totalForms,
            filename
        });

    } catch (error) {
        logger.error('Error al generar reporte estadístico:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: {
                    message: 'Error al generar reporte estadístico',
                    type: 'REPORT_ERROR'
                }
            });
        }
    }
};

/**
 * Función auxiliar para generar conclusiones automáticas
 */
function generateConclusions(totalForms, statusStats, avgScore, period) {
    const conclusions = [];

    // Análisis de volumen
    const formsPerDay = totalForms / parseInt(period);
    if (formsPerDay > 10) {
        conclusions.push(`Alto volumen de formularios con ${formsPerDay.toFixed(1)} formularios por día en promedio.`);
    } else if (formsPerDay < 2) {
        conclusions.push(`Bajo volumen de formularios con ${formsPerDay.toFixed(1)} formularios por día en promedio.`);
    } else {
        conclusions.push(`Volumen moderado de formularios con ${formsPerDay.toFixed(1)} formularios por día en promedio.`);
    }

    // Análisis de calidad
    if (avgScore >= 80) {
        conclusions.push(`Excelente calidad promedio con ${avgScore.toFixed(1)} puntos de 100.`);
    } else if (avgScore >= 60) {
        conclusions.push(`Calidad aceptable con ${avgScore.toFixed(1)} puntos de 100, hay oportunidades de mejora.`);
    } else {
        conclusions.push(`Calidad baja con ${avgScore.toFixed(1)} puntos de 100, requiere atención inmediata.`);
    }

    // Análisis de estados
    const completedForms = statusStats.find(s => s._id === 'completado')?.count || 0;
    const completionRate = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

    if (completionRate >= 80) {
        conclusions.push(`Excelente tasa de completitud con ${completionRate.toFixed(1)}% de formularios completados.`);
    } else if (completionRate >= 60) {
        conclusions.push(`Tasa de completitud moderada con ${completionRate.toFixed(1)}% de formularios completados.`);
    } else {
        conclusions.push(`Baja tasa de completitud con ${completionRate.toFixed(1)}% de formularios completados.`);
    }

    // Recomendaciones
    if (avgScore < 70) {
        conclusions.push('Recomendación: Implementar capacitación adicional para mejorar la calidad de los formularios.');
    }

    if (completionRate < 70) {
        conclusions.push('Recomendación: Revisar el proceso de seguimiento para mejorar la tasa de completitud.');
    }

    return conclusions;
}

module.exports = {
    generateFormsReport,
    generateStatsReport
};
