/**
 * @fileoverview Rutas de archivos
 * @description Maneja subida, descarga y gestión de archivos con storage real
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { File } = require('../models');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { upload, handleMulterError, cleanupFiles, getFileInfo } = require('../middleware/upload');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { body, param, query } = require('express-validator');

const router = express.Router();

/**
 * Validaciones para subida de archivos
 */
const uploadValidation = [
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La descripción no puede exceder 500 caracteres'),
    body('category')
        .optional()
        .isIn(['document', 'image', 'report', 'certificate', 'other'])
        .withMessage('Categoría inválida'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic debe ser boolean')
];

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Listar archivos
 *     description: Obtiene una lista paginada de archivos del usuario
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtrar por tipo MIME
 *     responses:
 *       200:
 *         description: Archivos obtenidos exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            type,
            search
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Construcción del filtro
        const filter = {};

        if (category) {
            filter['metadatos.categoria'] = category;
        }

        if (type) {
            filter.mimeType = { $regex: type, $options: 'i' };
        }

        if (search) {
            filter.$or = [
                { nombreOriginal: { $regex: search, $options: 'i' } },
                { descripcion: { $regex: search, $options: 'i' } }
            ];
        }

        // Si no es admin, solo mostrar archivos del usuario o públicos
        if (req.user.role !== 'admin') {
            filter.$or = [
                { 'metadatos.creadoPor': req.user.id },
                { 'metadatos.esPublico': true }
            ];
        }

        // Obtener archivos con paginación
        const [files, totalFiles] = await Promise.all([
            File.find(filter)
                .sort({ fechaCreacion: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('relaciones.formularioFSO', 'numeroOrden tipoFSO')
                .populate('metadatos.creadoPor', 'nombre email')
                .lean(),
            File.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalFiles / limitNum);

        logger.info('Archivos listados exitosamente', {
            userId: req.user.id,
            total: totalFiles,
            returned: files.length,
            filters: { category, type, search }
        });

        res.status(200).json({
            success: true,
            message: 'Archivos obtenidos exitosamente',
            data: {
                files,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalFiles,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });

    } catch (error) {
        logger.error('Error al obtener archivos:', {
            error: error.message,
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
});

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Subir archivos
 *     description: Sube uno o múltiples archivos al servidor
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Archivos a subir (máximo 5, 10MB cada uno)
 *               description:
 *                 type: string
 *                 description: Descripción opcional de los archivos
 *               category:
 *                 type: string
 *                 enum: [document, image, report, certificate, other]
 *                 description: Categoría del archivo
 *               isPublic:
 *                 type: boolean
 *                 description: Si el archivo es público
 *               relatedFormId:
 *                 type: string
 *                 description: ID del formulario relacionado
 *     responses:
 *       201:
 *         description: Archivos subidos exitosamente
 *       400:
 *         description: Error en la subida o validación
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/upload',
    authenticateToken,
    upload.array('files', 5),
    uploadValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { description = '', category = 'other', isPublic = false, relatedFormId } = req.body;
            const uploadedFiles = req.files;

            if (!uploadedFiles || uploadedFiles.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'No se proporcionaron archivos',
                        type: 'NO_FILES'
                    }
                });
            }

            const filePromises = uploadedFiles.map(async (file) => {
                const fileInfo = getFileInfo(file);

                // Crear registro en MongoDB
                const newFile = new File({
                    nombreOriginal: fileInfo.originalName,
                    nombreArchivo: fileInfo.filename,
                    rutaArchivo: fileInfo.path,
                    tamanoBytes: fileInfo.size,
                    mimeType: fileInfo.mimetype,
                    extension: path.extname(fileInfo.originalName).toLowerCase(),
                    descripcion: description,
                    metadatos: {
                        categoria: category,
                        esPublico: isPublic,
                        creadoPor: req.user.id,
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    },
                    relaciones: {
                        formularioFSO: relatedFormId || null
                    },
                    urls: {
                        descarga: `/api/v1/files/${fileInfo.filename}/download`,
                        vista: `/api/v1/files/${fileInfo.filename}/view`
                    }
                });

                await newFile.save();
                return newFile;
            });

            const savedFiles = await Promise.all(filePromises);

            logger.info('Archivos subidos exitosamente', {
                userId: req.user.id,
                filesCount: savedFiles.length,
                fileNames: savedFiles.map(f => f.nombreOriginal),
                totalSize: savedFiles.reduce((sum, f) => sum + f.tamanoBytes, 0)
            });

            res.status(201).json({
                success: true,
                message: 'Archivos subidos exitosamente',
                data: {
                    files: savedFiles.map(file => ({
                        id: file._id,
                        originalName: file.nombreOriginal,
                        filename: file.nombreArchivo,
                        size: file.tamanoBytes,
                        mimeType: file.mimeType,
                        downloadUrl: file.urls.descarga,
                        viewUrl: file.urls.vista,
                        uploadedAt: file.fechaCreacion
                    }))
                }
            });

        } catch (error) {
            // Limpiar archivos en caso de error
            if (req.files) {
                cleanupFiles(req.files);
            }

            logger.error('Error al subir archivos:', {
                error: error.message,
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
    }
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Obtener información de archivo
 *     description: Obtiene información detallada de un archivo específico
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo
 *     responses:
 *       200:
 *         description: Información del archivo obtenida exitosamente
 *       404:
 *         description: Archivo no encontrado
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const file = await File.findById(id)
            .populate('relaciones.formularioFSO', 'numeroOrden tipoFSO')
            .populate('metadatos.creadoPor', 'nombre email')
            .lean();

        if (!file) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Archivo no encontrado',
                    type: 'NOT_FOUND'
                }
            });
        }

        // Verificar permisos
        if (req.user.role !== 'admin' &&
            file.metadatos.creadoPor._id.toString() !== req.user.id &&
            !file.metadatos.esPublico) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Sin permisos para acceder a este archivo',
                    type: 'FORBIDDEN'
                }
            });
        }

        logger.info('Información de archivo obtenida', {
            fileId: id,
            fileName: file.nombreOriginal,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Información del archivo obtenida exitosamente',
            data: {
                file
            }
        });

    } catch (error) {
        logger.error('Error al obtener información del archivo:', {
            error: error.message,
            fileId: req.params.id,
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
});

/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Descargar archivo
 *     description: Descarga un archivo específico
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo
 *       - in: query
 *         name: inline
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Si mostrar inline en lugar de descargar
 *     responses:
 *       200:
 *         description: Archivo descargado exitosamente
 *       404:
 *         description: Archivo no encontrado
 *       403:
 *         description: Sin permisos para descargar
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { inline = false } = req.query;

        const file = await File.findById(id);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Archivo no encontrado',
                    type: 'NOT_FOUND'
                }
            });
        }

        // Verificar permisos
        if (req.user.role !== 'admin' &&
            file.metadatos.creadoPor.toString() !== req.user.id &&
            !file.metadatos.esPublico) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Sin permisos para descargar este archivo',
                    type: 'FORBIDDEN'
                }
            });
        }

        // Verificar que el archivo físico existe
        if (!fs.existsSync(file.rutaArchivo)) {
            logger.error('Archivo físico no encontrado:', {
                fileId: id,
                path: file.rutaArchivo
            });

            return res.status(404).json({
                success: false,
                error: {
                    message: 'Archivo físico no encontrado',
                    type: 'FILE_NOT_FOUND'
                }
            });
        }

        // Configurar headers
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', file.tamanoBytes);

        if (inline === 'true') {
            res.setHeader('Content-Disposition', `inline; filename="${file.nombreOriginal}"`);
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${file.nombreOriginal}"`);
        }

        // Crear stream y enviar archivo
        const fileStream = fs.createReadStream(file.rutaArchivo);

        fileStream.on('error', (error) => {
            logger.error('Error al leer archivo:', {
                error: error.message,
                fileId: id,
                path: file.rutaArchivo
            });

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: {
                        message: 'Error al leer archivo',
                        type: 'READ_ERROR'
                    }
                });
            }
        });

        fileStream.pipe(res);

        // Registrar descarga
        await File.findByIdAndUpdate(id, {
            $inc: { 'metadatos.contadorDescargas': 1 },
            $set: { 'metadatos.ultimaDescarga': new Date() }
        });

        logger.info('Archivo descargado exitosamente', {
            fileId: id,
            fileName: file.nombreOriginal,
            userId: req.user.id,
            inline: inline === 'true'
        });

    } catch (error) {
        logger.error('Error al descargar archivo:', {
            error: error.message,
            fileId: req.params.id,
            userId: req.user?.id
        });

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: {
                    message: 'Error interno del servidor',
                    type: 'INTERNAL_ERROR'
                }
            });
        }
    }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Eliminar archivo
 *     description: Elimina un archivo y su registro de la base de datos
 *     tags: [Archivos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo
 *     responses:
 *       200:
 *         description: Archivo eliminado exitosamente
 *       404:
 *         description: Archivo no encontrado
 *       403:
 *         description: Sin permisos para eliminar
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const file = await File.findById(id);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Archivo no encontrado',
                    type: 'NOT_FOUND'
                }
            });
        }

        // Verificar permisos (solo el creador o admin)
        if (req.user.role !== 'admin' &&
            file.metadatos.creadoPor.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Sin permisos para eliminar este archivo',
                    type: 'FORBIDDEN'
                }
            });
        }

        // Eliminar archivo físico
        if (fs.existsSync(file.rutaArchivo)) {
            fs.unlinkSync(file.rutaArchivo);
        }

        // Eliminar registro de la base de datos
        await File.findByIdAndDelete(id);

        logger.info('Archivo eliminado exitosamente', {
            fileId: id,
            fileName: file.nombreOriginal,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Archivo eliminado exitosamente',
            data: {
                fileId: id,
                fileName: file.nombreOriginal,
                deletedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error al eliminar archivo:', {
            error: error.message,
            fileId: req.params.id,
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
});

// Middleware para manejar errores de multer
router.use(handleMulterError);

module.exports = router;
