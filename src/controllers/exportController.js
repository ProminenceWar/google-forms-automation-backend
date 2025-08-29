/**
 * @fileoverview Controlador de Exportación de Datos
 * @description Maneja la exportación de datos en múltiples formatos
 */

const { FSOForm, User, File } = require('../models');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');

/**
 * Exportar datos de formularios en formato CSV
 */
const exportFormsCSV = async (req, res) => {
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
        const forms = await FSOForm.find(filters)
            .sort({ fechaCreacion: -1 })
            .lean();

        // Generar CSV
        let csvContent = '';

        // Headers básicos
        const basicHeaders = [
            'ID Formulario',
            'Número de Orden',
            'Email',
            'Tipo FSO',
            'Compañía Inspección',
            'Técnico',
            'Estado',
            'Puntaje Total',
            'Fecha Creación',
            'Fecha Actualización'
        ];

        // Headers detallados si se solicitan
        const detailHeaders = includeDetails === 'true' ? [
            'Cliente Nombre',
            'Cliente Teléfono',
            'Cliente Dirección',
            'Items Completados',
            'Creado Por',
            'Modificado Por'
        ] : [];

        const headers = [...basicHeaders, ...detailHeaders];
        csvContent += headers.join(',') + '\n';

        // Datos
        forms.forEach(form => {
            const basicData = [
                `"${form.formId || ''}"`,
                `"${form.numeroOrden || ''}"`,
                `"${form.email || ''}"`,
                `"${form.tipoFSO || ''}"`,
                `"${form.companiaInspeccion || ''}"`,
                `"${form.nombreTecnico || ''}"`,
                `"${form.estado || ''}"`,
                form.puntajeTotal || 0,
                `"${form.fechaCreacion ? form.fechaCreacion.toISOString() : ''}"`,
                `"${form.fechaActualizacion ? form.fechaActualizacion.toISOString() : ''}"`
            ];

            const detailData = includeDetails === 'true' ? [
                `"${form.datosCliente?.nombre || ''}"`,
                `"${form.datosCliente?.telefono || ''}"`,
                `"${form.datosCliente?.direccion || ''}"`,
                calculateCompletedItems(form.itemsInspeccion),
                `"${form.creadoPor || ''}"`,
                `"${form.modificadoPor || ''}"`
            ] : [];

            const rowData = [...basicData, ...detailData];
            csvContent += rowData.join(',') + '\n';
        });

        // Configurar headers de respuesta
        const filename = `formularios_${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

        // Log de actividad
        logger.info('Exportación CSV realizada:', {
            userId: req.user.id,
            totalRecords: forms.length,
            filters,
            filename
        });

        res.status(200).send(csvContent);

    } catch (error) {
        logger.error('Error en exportación CSV:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al exportar datos',
                type: 'EXPORT_ERROR'
            }
        });
    }
};

/**
 * Exportar datos de formularios en formato Excel
 */
const exportFormsExcel = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            status,
            tipoFSO,
            companiaInspeccion,
            includeCharts = 'true'
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
            FSOForm.find(filters).sort({ fechaCreacion: -1 }).lean(),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$estado', count: { $sum: 1 } } }
            ]),
            FSOForm.aggregate([
                { $match: filters },
                { $group: { _id: '$tipoFSO', count: { $sum: 1 } } }
            ])
        ]);

        // Crear workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'FSO Automation System';
        workbook.created = new Date();

        // Hoja principal de datos
        const mainSheet = workbook.addWorksheet('Formularios', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // Headers con estilo
        const headers = [
            'ID Formulario', 'Número de Orden', 'Email', 'Tipo FSO',
            'Compañía Inspección', 'Técnico', 'Estado', 'Puntaje Total',
            'Cliente', 'Fecha Creación', 'Fecha Actualización'
        ];

        const headerRow = mainSheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '366092' }
            };
            cell.alignment = { horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Datos
        forms.forEach(form => {
            const row = mainSheet.addRow([
                form.formId,
                form.numeroOrden,
                form.email,
                form.tipoFSO,
                form.companiaInspeccion,
                form.nombreTecnico,
                form.estado,
                form.puntajeTotal,
                form.datosCliente?.nombre || '',
                form.fechaCreacion,
                form.fechaActualizacion
            ]);

            // Colorear filas basado en estado
            const statusColors = {
                'completado': 'C6EFCE',
                'pendiente': 'FFEB9C',
                'en_progreso': 'BDD7EE',
                'rechazado': 'FFC7CE'
            };

            if (statusColors[form.estado]) {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: statusColors[form.estado] }
                    };
                });
            }
        });

        // Ajustar ancho de columnas
        mainSheet.columns.forEach((column, index) => {
            let maxLength = headers[index].length;
            column.eachCell({ includeEmpty: false }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength + 2, 50);
        });

        // Hoja de estadísticas si se solicita
        if (includeCharts === 'true') {
            const statsSheet = workbook.addWorksheet('Estadísticas');

            // Estadísticas por estado
            statsSheet.addRow(['Estadísticas por Estado']);
            statsSheet.addRow(['Estado', 'Cantidad']);
            statusStats.forEach(stat => {
                statsSheet.addRow([stat._id, stat.count]);
            });

            statsSheet.addRow([]);

            // Estadísticas por tipo
            statsSheet.addRow(['Estadísticas por Tipo FSO']);
            statsSheet.addRow(['Tipo', 'Cantidad']);
            typeStats.forEach(stat => {
                statsSheet.addRow([stat._id, stat.count]);
            });

            // Estilo para headers de estadísticas
            statsSheet.getRow(1).font = { bold: true, size: 14 };
            statsSheet.getRow(2).font = { bold: true };

            const statsHeaderRow = statsSheet.getRow(2 + statusStats.length + 2);
            if (statsHeaderRow) {
                statsHeaderRow.font = { bold: true, size: 14 };
            }
        }

        // Generar archivo
        const filename = `formularios_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Log de actividad
        logger.info('Exportación Excel realizada:', {
            userId: req.user.id,
            totalRecords: forms.length,
            filters,
            filename,
            includeCharts
        });

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        logger.error('Error en exportación Excel:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al exportar datos en Excel',
                type: 'EXPORT_ERROR'
            }
        });
    }
};

/**
 * Exportar datos de formularios en formato JSON
 */
const exportFormsJSON = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            status,
            tipoFSO,
            companiaInspeccion,
            includeMetadata = 'true'
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
        const forms = await FSOForm.find(filters)
            .sort({ fechaCreacion: -1 })
            .lean();

        // Preparar datos de exportación
        const exportData = {
            data: forms,
            export: {
                timestamp: new Date().toISOString(),
                totalRecords: forms.length,
                filters: filters,
                exportedBy: req.user.id,
                version: '1.0'
            }
        };

        // Incluir metadata si se solicita
        if (includeMetadata === 'true') {
            const [statusStats, typeStats] = await Promise.all([
                FSOForm.aggregate([
                    { $match: filters },
                    { $group: { _id: '$estado', count: { $sum: 1 } } }
                ]),
                FSOForm.aggregate([
                    { $match: filters },
                    { $group: { _id: '$tipoFSO', count: { $sum: 1 } } }
                ])
            ]);

            exportData.metadata = {
                statusDistribution: statusStats,
                typeDistribution: typeStats,
                dateRange: {
                    start: startDate || null,
                    end: endDate || null
                }
            };
        }

        // Configurar headers de respuesta
        const filename = `formularios_${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Log de actividad
        logger.info('Exportación JSON realizada:', {
            userId: req.user.id,
            totalRecords: forms.length,
            filters,
            filename,
            includeMetadata
        });

        res.status(200).json(exportData);

    } catch (error) {
        logger.error('Error en exportación JSON:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: {
                message: 'Error al exportar datos en JSON',
                type: 'EXPORT_ERROR'
            }
        });
    }
};

/**
 * Función auxiliar para calcular items completados
 */
function calculateCompletedItems(itemsInspeccion) {
    if (!itemsInspeccion) return 0;

    let completed = 0;
    let total = 0;

    Object.keys(itemsInspeccion).forEach(category => {
        if (typeof itemsInspeccion[category] === 'object') {
            Object.keys(itemsInspeccion[category]).forEach(item => {
                total++;
                if (itemsInspeccion[category][item] === true) {
                    completed++;
                }
            });
        }
    });

    return total > 0 ? `${completed}/${total}` : '0/0';
}

module.exports = {
    exportFormsCSV,
    exportFormsExcel,
    exportFormsJSON
};
