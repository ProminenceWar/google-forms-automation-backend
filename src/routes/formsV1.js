/**
 * @fileoverview Rutas de formularios FSO v1
 * @description Maneja operaciones CRUD de formularios FSO con MongoDB Atlas
 * @version 1.0.0
 */

const express = require('express');
const { FSOForm } = require('../models');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const {
    handleValidationErrors,
    calculateFormScore,
    checkFormPermissions
} = require('../middleware/validationMiddleware');
const {
    createFormValidation,
    updateFormValidation,
    deleteFormValidation,
    getFormValidation,
    listFormsValidation
} = require('../validators/fsoFormValidators');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FormFSO:
 *       type: object
 *       required:
 *         - email
 *         - numeroOrden
 *         - tipoFSO
 *         - companiaInspeccion
 *         - nombreTecnico
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del formulario
 *         formId:
 *           type: string
 *           description: ID de formulario generado automáticamente
 *         email:
 *           type: string
 *           format: email
 *           description: Email del solicitante
 *         numeroOrden:
 *           type: string
 *           description: Número único de orden
 *         tipoFSO:
 *           type: string
 *           enum: [inspeccion_inicial, seguimiento, reinspeccion]
 *           description: Tipo de inspección FSO
 *         companiaInspeccion:
 *           type: string
 *           description: Compañía responsable de la inspección
 *         nombreTecnico:
 *           type: string
 *           description: Nombre del técnico asignado
 *         estado:
 *           type: string
 *           enum: [pendiente, en_progreso, completado, rechazado]
 *           description: Estado actual del formulario
 *         puntajeTotal:
 *           type: number
 *           description: Puntaje total calculado automáticamente
 *         datosCliente:
 *           type: object
 *           description: Información del cliente
 *         itemsInspeccion:
 *           type: object
 *           description: Items de inspección con checkboxes
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del formulario
 *         fechaActualizacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 */

/**
 * @swagger
 * /api/v1/forms:
 *   get:
 *     summary: Listar formularios FSO
 *     description: Obtiene una lista paginada de formularios FSO con filtros opcionales
 *     tags: [Formularios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendiente, en_progreso, completado, rechazado]
 *         description: Filtrar por estado
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por número de orden, nombre del cliente o técnico
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: fechaCreacion
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de formularios obtenida exitosamente
 *       401:
 *         description: Token de acceso requerido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/',
    authenticateToken,
    listFormsValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                search,
                sortBy = 'fechaCreacion',
                sortOrder = 'desc'
            } = req.query;

            // Construir filtros de búsqueda
            const searchFilter = {};

            if (status) {
                searchFilter.estado = status;
            }

            if (search) {
                searchFilter.$or = [
                    { numeroOrden: { $regex: search, $options: 'i' } },
                    { 'datosCliente.nombre': { $regex: search, $options: 'i' } },
                    { nombreTecnico: { $regex: search, $options: 'i' } }
                ];
            }

            // Configurar paginación
            const currentPage = parseInt(page);
            const itemsPerPage = parseInt(limit);
            const skipItems = (currentPage - 1) * itemsPerPage;

            // Configurar ordenamiento
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Ejecutar consultas en paralelo para optimizar rendimiento
            const [formsList, totalCount, statusStats] = await Promise.all([
                FSOForm.find(searchFilter)
                    .sort(sortOptions)
                    .skip(skipItems)
                    .limit(itemsPerPage)
                    .lean(),
                FSOForm.countDocuments(searchFilter),
                FSOForm.aggregate([
                    { $group: { _id: '$estado', count: { $sum: 1 } } }
                ])
            ]);

            // Preparar estadísticas de resumen
            const summaryStats = {
                total: await FSOForm.countDocuments(),
                pendiente: 0,
                en_progreso: 0,
                completado: 0,
                rechazado: 0
            };

            // Mapear estadísticas de estado
            statusStats.forEach(stat => {
                if (stat._id && Object.prototype.hasOwnProperty.call(summaryStats, stat._id)) {
                    summaryStats[stat._id] = stat.count;
                }
            });

            // Calcular información de paginación
            const totalPages = Math.ceil(totalCount / itemsPerPage);

            // Log de actividad
            logger.info('Formularios listados exitosamente:', {
                userId: req.user.id,
                userRole: req.user.role,
                totalFound: formsList.length,
                filters: { status, search },
                pagination: { page: currentPage, limit: itemsPerPage }
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Formularios obtenidos exitosamente',
                data: {
                    forms: formsList,
                    pagination: {
                        currentPage,
                        totalPages,
                        totalItems: totalCount,
                        itemsPerPage,
                        hasNextPage: currentPage < totalPages,
                        hasPrevPage: currentPage > 1
                    },
                    summary: summaryStats
                }
            });

        } catch (error) {
            logger.error('Error al obtener formularios:', {
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
    });

/**
 * @swagger
 * /api/v1/forms:
 *   post:
 *     summary: Crear nuevo formulario FSO
 *     description: Crea un nuevo formulario de inspección FSO
 *     tags: [Formularios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - numeroOrden
 *               - tipoFSO
 *               - companiaInspeccion
 *               - nombreTecnico
 *               - datosCliente
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               numeroOrden:
 *                 type: string
 *               tipoFSO:
 *                 type: string
 *                 enum: [inspeccion_inicial, seguimiento, reinspeccion]
 *               companiaInspeccion:
 *                 type: string
 *               nombreTecnico:
 *                 type: string
 *               datosCliente:
 *                 type: object
 *               itemsInspeccion:
 *                 type: object
 *                 description: Items de inspección opcionales
 *     responses:
 *       201:
 *         description: Formulario creado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autorizado
 *       409:
 *         description: Número de orden duplicado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/',
    authenticateToken,
    createFormValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const formData = req.body;

            // Generar ID único para el formulario
            const uniqueFormId = `FSO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Calcular puntaje automático si hay items de inspección
            const calculatedScore = formData.itemsInspeccion
                ? calculateFormScore(formData.itemsInspeccion)
                : 0;

            // Preparar datos del nuevo formulario
            const newFormData = {
                ...formData,
                formId: uniqueFormId,
                puntajeTotal: calculatedScore,
                estado: 'pendiente',
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                creadoPor: req.user.id
            };

            // Crear y guardar el formulario
            const newForm = new FSOForm(newFormData);
            const savedForm = await newForm.save();

            // Log de actividad
            logger.info('Formulario creado exitosamente:', {
                formId: savedForm.formId,
                numeroOrden: savedForm.numeroOrden,
                tipoFSO: savedForm.tipoFSO,
                creadoPor: req.user.id,
                userRole: req.user.role,
                puntajeTotal: savedForm.puntajeTotal
            });

            // Respuesta exitosa
            res.status(201).json({
                success: true,
                message: 'Formulario creado exitosamente',
                data: {
                    form: savedForm
                }
            });

        } catch (error) {
            logger.error('Error al crear formulario:', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                formData: req.body
            });

            // Manejar errores específicos
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: {
                        message: 'El número de orden ya existe',
                        type: 'DUPLICATE_ERROR',
                        field: 'numeroOrden'
                    }
                });
            }

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
 * /api/v1/forms/{id}:
 *   get:
 *     summary: Obtener formulario por ID
 *     description: Obtiene los detalles de un formulario específico
 *     tags: [Formularios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del formulario
 *     responses:
 *       200:
 *         description: Formulario obtenido exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Formulario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id',
    authenticateToken,
    getFormValidation,
    handleValidationErrors,
    checkFormPermissions,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Buscar formulario por ID
            const foundForm = await FSOForm.findById(id).lean();

            if (!foundForm) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Formulario no encontrado',
                        type: 'NOT_FOUND'
                    }
                });
            }

            // Log de actividad
            logger.info('Formulario obtenido exitosamente:', {
                formId: foundForm.formId,
                numeroOrden: foundForm.numeroOrden,
                estado: foundForm.estado,
                solicitadoPor: req.user.id,
                userRole: req.user.role
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Formulario obtenido exitosamente',
                data: {
                    form: foundForm
                }
            });

        } catch (error) {
            logger.error('Error al obtener formulario:', {
                error: error.message,
                stack: error.stack,
                formId: req.params.id,
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
 * /api/v1/forms/{id}:
 *   put:
 *     summary: Actualizar formulario
 *     description: Actualiza un formulario existente
 *     tags: [Formularios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del formulario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FormFSO'
 *     responses:
 *       200:
 *         description: Formulario actualizado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos para actualizar
 *       404:
 *         description: Formulario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id',
    authenticateToken,
    updateFormValidation,
    handleValidationErrors,
    checkFormPermissions,
    async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Verificar que el formulario existe
            const existingForm = await FSOForm.findById(id);
            if (!existingForm) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Formulario no encontrado',
                        type: 'NOT_FOUND'
                    }
                });
            }

            // Recalcular puntaje si se actualizaron items de inspección
            if (updateData.itemsInspeccion) {
                updateData.puntajeTotal = calculateFormScore(updateData.itemsInspeccion);
            }

            // Actualizar metadatos
            updateData.fechaActualizacion = new Date();
            updateData.modificadoPor = req.user.id;

            // Actualizar formulario en la base de datos
            const updatedForm = await FSOForm.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).lean();

            // Log de actividad
            logger.info('Formulario actualizado exitosamente:', {
                formId: updatedForm.formId,
                numeroOrden: updatedForm.numeroOrden,
                modificadoPor: req.user.id,
                userRole: req.user.role,
                puntajePrevio: existingForm.puntajeTotal,
                puntajeNuevo: updatedForm.puntajeTotal
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Formulario actualizado exitosamente',
                data: {
                    form: updatedForm
                }
            });

        } catch (error) {
            logger.error('Error al actualizar formulario:', {
                error: error.message,
                stack: error.stack,
                formId: req.params.id,
                userId: req.user?.id,
                updateData: req.body
            });

            // Manejar errores específicos
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: {
                        message: 'El número de orden ya existe',
                        type: 'DUPLICATE_ERROR',
                        field: 'numeroOrden'
                    }
                });
            }

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
 * /api/v1/forms/{id}:
 *   delete:
 *     summary: Eliminar formulario
 *     description: Elimina un formulario (solo admins y supervisores)
 *     tags: [Formularios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del formulario
 *     responses:
 *       200:
 *         description: Formulario eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Formulario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    deleteFormValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que el formulario existe
            const formToDelete = await FSOForm.findById(id);
            if (!formToDelete) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Formulario no encontrado',
                        type: 'NOT_FOUND'
                    }
                });
            }

            // Eliminar formulario
            await FSOForm.findByIdAndDelete(id);

            // Log de actividad
            logger.info('Formulario eliminado exitosamente:', {
                formId: formToDelete.formId,
                numeroOrden: formToDelete.numeroOrden,
                tipoFSO: formToDelete.tipoFSO,
                eliminadoPor: req.user.id,
                userRole: req.user.role
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Formulario eliminado exitosamente',
                data: {
                    deletedFormId: formToDelete.formId,
                    numeroOrden: formToDelete.numeroOrden
                }
            });

        } catch (error) {
            logger.error('Error al eliminar formulario:', {
                error: error.message,
                stack: error.stack,
                formId: req.params.id,
                userId: req.user?.id,
                userRole: req.user?.role
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
 * /api/v1/forms/{id}/status:
 *   patch:
 *     summary: Actualizar estado del formulario
 *     description: Cambia el estado de un formulario específico
 *     tags: [Formularios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del formulario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, en_progreso, completado, rechazado]
 *               comentario:
 *                 type: string
 *                 description: Comentario opcional sobre el cambio de estado
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Formulario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/status',
    authenticateToken,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { estado, comentario } = req.body;

            // Validar estado
            const validStates = ['pendiente', 'en_progreso', 'completado', 'rechazado'];
            if (!validStates.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Estado inválido',
                        type: 'INVALID_STATUS',
                        validStates
                    }
                });
            }

            // Verificar que el formulario existe
            const currentForm = await FSOForm.findById(id);
            if (!currentForm) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Formulario no encontrado',
                        type: 'NOT_FOUND'
                    }
                });
            }

            // Preparar datos de actualización
            const statusUpdateData = {
                estado,
                fechaActualizacion: new Date(),
                modificadoPor: req.user.id
            };

            // Agregar comentario si se proporciona
            if (comentario) {
                statusUpdateData.comentarioEstado = comentario;
            }

            // Actualizar estado
            const updatedForm = await FSOForm.findByIdAndUpdate(
                id,
                statusUpdateData,
                { new: true, runValidators: true }
            ).lean();

            // Log de actividad
            logger.info('Estado del formulario actualizado:', {
                formId: updatedForm.formId,
                numeroOrden: updatedForm.numeroOrden,
                estadoPrevio: currentForm.estado,
                estadoNuevo: estado,
                modificadoPor: req.user.id,
                userRole: req.user.role,
                comentario: comentario || 'Sin comentario'
            });

            // Respuesta exitosa
            res.status(200).json({
                success: true,
                message: 'Estado actualizado exitosamente',
                data: {
                    form: updatedForm,
                    cambioEstado: {
                        anterior: currentForm.estado,
                        nuevo: estado,
                        fecha: new Date(),
                        modificadoPor: req.user.id,
                        comentario: comentario || null
                    }
                }
            });

        } catch (error) {
            logger.error('Error al actualizar estado del formulario:', {
                error: error.message,
                stack: error.stack,
                formId: req.params.id,
                userId: req.user?.id,
                nuevoEstado: req.body.estado
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

module.exports = router;
