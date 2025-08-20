/**
 * @fileoverview Rutas de archivos
 * @description Maneja subida, descarga y gestión de archivos
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { File } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Middleware para autenticación (simulado)
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Token de acceso requerido',
                type: 'UNAUTHORIZED'
            }
        });
    }

    // En producción, verificar token JWT aquí
    req.user = { id: '1', email: 'test@example.com', role: 'admin' };
    next();
};

/**
 * GET /api/v1/files
 * Lista todos los archivos del usuario
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, category, type } = req.query;

        // Obtener archivos desde MongoDB
        const filter = {};

        if (category) {
            filter['metadatos.categoria'] = category;
        }

        if (type) {
            filter.mimeType = { $regex: type, $options: 'i' };
        }

        // Calcular skip y limit para paginación
        const skip = (page - 1) * limit;
        const limitNum = parseInt(limit);

        // Obtener archivos con paginación
        const files = await File.find(filter)
            .sort({ fechaCreacion: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('relaciones.formularioFSO', 'numeroOrden tipoFSO')
            .populate('relaciones.usuario', 'name email')
            .lean();

        // Obtener total de documentos para paginación
        const totalFiles = await File.countDocuments(filter);

        logger.info('Archivos listados exitosamente:', {
            userId: req.user.id,
            total: totalFiles,
            returned: files.length,
            page,
            limit
        });

        res.status(200).json({
            success: true,
            message: 'Archivos obtenidos exitosamente',
            data: {
                files: files,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalFiles / limitNum),
                    totalFiles: totalFiles,
                    limit: limitNum
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
 * POST /api/v1/files/upload
 * Sube un nuevo archivo
 */
router.post('/upload', authenticateToken, async (req, res) => {
    try {
        // En producción, usar multer para manejo de archivos
        const { filename, category = 'general', description } = req.body;

        if (!filename) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Nombre de archivo requerido',
                    type: 'VALIDATION_ERROR'
                }
            });
        }

        // Crear nuevo archivo en MongoDB
        const newFile = new File({
            nombre: filename,
            nombreArchivo: `${Date.now()}_${filename}`,
            extension: filename.split('.').pop().toLowerCase(),
            mimeType: getMimeType(filename),
            tamaño: Math.floor(Math.random() * 5000000) + 100000, // Simulado por ahora
            hash: generateFileHash(),
            storage: {
                tipo: 'local',
                ruta: `/storage/files/${Date.now()}_${filename}`,
                url: `/api/files/${Date.now()}_${filename}`
            },
            relaciones: {
                usuario: req.user.id // En producción, usar ObjectId real
            },
            metadatos: {
                descripcion: description || '',
                categoria: category || 'documento',
                origen: 'upload'
            }
        });

        const savedFile = await newFile.save();

        logger.info('Archivo subido exitosamente:', {
            fileId: savedFile.fileId,
            filename: savedFile.nombre,
            size: savedFile.tamaño,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Archivo subido exitosamente',
            data: {
                file: savedFile
            }
        });

    } catch (error) {
        logger.error('Error al subir archivo:', {
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
 * GET /api/v1/files/:id
 * Obtiene información de un archivo específico
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener archivo desde MongoDB
        const file = await File.findOne({
            $or: [
                { fileId: id },
                { _id: id }
            ]
        })
            .populate('relaciones.formularioFSO', 'numeroOrden tipoFSO')
            .populate('relaciones.usuario', 'name email')
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

        logger.info('Archivo obtenido exitosamente:', {
            fileId: id,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Archivo obtenido exitosamente',
            data: {
                file: file
            }
        });

    } catch (error) {
        logger.error('Error al obtener archivo:', {
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
 * DELETE /api/v1/files/:id
 * Elimina un archivo
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // En producción, verificar permisos y eliminar archivo

        logger.info('Archivo eliminado exitosamente:', {
            fileId: id,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Archivo eliminado exitosamente',
            data: {
                fileId: id,
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

/**
 * Funciones de utilidad
 */
function getMimeType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[extension] || 'application/octet-stream';
}

function generateFileHash() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

module.exports = router;
