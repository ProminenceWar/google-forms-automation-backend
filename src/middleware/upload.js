/**
 * @fileoverview Configuración de multer para subida de archivos
 * @description Configuración para manejo de archivos multipart/form-data
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Crear directorio de almacenamiento si no existe
const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Crear subdirectorio basado en la fecha
        const dateDir = new Date().toISOString().split('T')[0];
        const fullPath = path.join(uploadDir, dateDir);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        // Generar nombre único manteniendo la extensión original
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtro de tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'text/plain' // .txt
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.docx', '.doc', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${allowedTypes.join(', ')}`), false);
    }
};

// Configuración principal de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 5 // Máximo 5 archivos por request
    }
});

/**
 * Middleware para manejar errores de multer
 */
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        logger.error('Error de multer:', {
            error: error.message,
            code: error.code,
            field: error.field,
            userId: req.user?.id
        });

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'El archivo excede el tamaño máximo permitido (10MB)',
                        type: 'FILE_TOO_LARGE'
                    }
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Demasiados archivos. Máximo 5 archivos por solicitud',
                        type: 'TOO_MANY_FILES'
                    }
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Campo de archivo inesperado',
                        type: 'UNEXPECTED_FIELD'
                    }
                });
            default:
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Error en la subida de archivo',
                        type: 'UPLOAD_ERROR'
                    }
                });
        }
    }

    if (error.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({
            success: false,
            error: {
                message: error.message,
                type: 'INVALID_FILE_TYPE'
            }
        });
    }

    next(error);
};

/**
 * Función para limpiar archivos temporales en caso de error
 */
const cleanupFiles = (files) => {
    if (files && files.length > 0) {
        files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) {
                    logger.error('Error al limpiar archivo temporal:', {
                        file: file.path,
                        error: err.message
                    });
                }
            });
        });
    }
};

/**
 * Función para obtener información del archivo
 */
const getFileInfo = (file) => {
    return {
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        destination: file.destination,
        encoding: file.encoding
    };
};

module.exports = {
    upload,
    handleMulterError,
    cleanupFiles,
    getFileInfo,
    uploadDir
};
