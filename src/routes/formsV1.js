/**
 * @fileoverview Rutas de formularios v1
 * @description Maneja operaciones CRUD de formularios FSO
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { FSOForm } = require('../models');
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
 * @swagger
 * /api/v1/forms:
 *   get:
 *     summary: Listar formularios FSO
 *     description: Obtiene una lista paginada de formularios de órdenes de servicio
 *     tags: [Formularios FSO]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *         description: Filtrar por estado
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en título, número de orden o cliente
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Campo para ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Formularios obtenidos exitosamente
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
 *                   example: "Formularios obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     forms:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FormFSO'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalForms:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         inProgress:
 *                           type: integer
 *       401:
 *         description: Token de acceso requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Obtener formularios FSO desde MongoDB
        const filter = {};

        if (status) {
            filter.estado = status;
        }

        if (search) {
            filter.$or = [
                { numeroOrden: { $regex: search, $options: 'i' } },
                { 'datosCliente.nombre': { $regex: search, $options: 'i' } },
                { nombreTecnico: { $regex: search, $options: 'i' } }
            ];
        }

        // Calcular skip y limit para paginación
        const skip = (page - 1) * limit;
        const limitNum = parseInt(limit);

        // Construir sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Obtener formularios con paginación
        const forms = await FSOForm.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Obtener total de documentos para paginación
        const totalForms = await FSOForm.countDocuments(filter);

        // Obtener estadísticas de resumen
        const [totalCount, completedCount, pendingCount, inProgressCount] = await Promise.all([
            FSOForm.countDocuments(),
            FSOForm.countDocuments({ estado: 'completado' }),
            FSOForm.countDocuments({ estado: 'pendiente' }),
            FSOForm.countDocuments({ estado: 'en_progreso' })
        ]);

        logger.info('Formularios listados exitosamente:', {
            userId: req.user.id,
            total: totalForms,
            returned: forms.length,
            filters: { status, search },
            page,
            limit
        });

        res.status(200).json({
            success: true,
            message: 'Formularios obtenidos exitosamente',
            data: {
                forms: forms,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalForms / limitNum),
                    totalForms: totalForms,
                    limit: limitNum
                },
                summary: {
                    total: totalCount,
                    completed: completedCount,
                    pending: pendingCount,
                    inProgress: inProgressCount
                }
            }
        });

    } catch (error) {
        logger.error('Error al obtener formularios:', {
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
 * POST /api/v1/forms
 * Crea un nuevo formulario FSO
 */
router.post('/',
    authenticateToken,
    [
        body('title')
            .isLength({ min: 5, max: 200 })
            .withMessage('El título debe tener entre 5 y 200 caracteres'),
        body('customer.name')
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre del cliente es requerido'),
        body('customer.address')
            .isLength({ min: 10, max: 500 })
            .withMessage('La dirección debe tener entre 10 y 500 caracteres'),
        body('installation.type')
            .isIn(['fiber_optic', 'maintenance', 'repair', 'upgrade'])
            .withMessage('Tipo de instalación no válido'),
        body('priority')
            .optional()
            .isIn(['low', 'medium', 'high', 'urgent'])
            .withMessage('Prioridad no válida')
    ],
    async (req, res) => {
        try {
            // Validar entrada
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Datos de entrada no válidos',
                        type: 'VALIDATION_ERROR',
                        details: errors.array()
                    }
                });
            }

            const {
                title,
                description = '',
                customer,
                installation,
                priority = 'medium',
                assignedTo,
                scheduledDate
            } = req.body;

            // Crear nuevo formulario
            const newForm = {
                id: `fso_${Date.now()}`,
                orderNumber: `ORD-2025-${String(Date.now()).slice(-6)}`,
                title,
                description,
                status: 'pending',
                priority,
                assignedTo: assignedTo || null,
                customer: {
                    name: customer.name,
                    address: customer.address,
                    phone: customer.phone || '',
                    email: customer.email || ''
                },
                installation: {
                    type: installation.type,
                    speed: installation.speed || null,
                    scope: installation.scope || null,
                    equipment: installation.equipment || [],
                    scheduledDate: scheduledDate || null,
                    completedDate: null
                },
                createdBy: req.user.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    submissionCount: 0,
                    lastSubmission: null,
                    estimatedDuration: installation.estimatedDuration || 120,
                    actualDuration: null
                }
            };

            logger.info('Formulario creado exitosamente:', {
                formId: newForm.id,
                orderNumber: newForm.orderNumber,
                title: newForm.title,
                userId: req.user.id
            });

            res.status(201).json({
                success: true,
                message: 'Formulario creado exitosamente',
                data: {
                    form: newForm
                }
            });

        } catch (error) {
            logger.error('Error al crear formulario:', {
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
 * GET /api/v1/forms/:id
 * Obtiene un formulario específico por ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener formulario desde MongoDB
        const form = await FSOForm.findOne({
            $or: [
                { formId: id },
                { _id: id }
            ]
        }).lean();

        if (!form) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Formulario no encontrado',
                    type: 'NOT_FOUND'
                }
            });
        }

        logger.info('Formulario obtenido exitosamente:', {
            formId: id,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Formulario obtenido exitosamente',
            data: {
                form: form
            }
        });

    } catch (error) {
        logger.error('Error al obtener formulario:', {
            error: error.message,
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
 * PUT /api/v1/forms/:id
 * Actualiza un formulario existente
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // En producción, validar y actualizar en base de datos
        const updatedForm = {
            id: id,
            ...updateData,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.id
        };

        logger.info('Formulario actualizado exitosamente:', {
            formId: id,
            userId: req.user.id,
            updatedFields: Object.keys(updateData)
        });

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
 * DELETE /api/v1/forms/:id
 * Elimina un formulario
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // En producción, validar permisos y eliminar de base de datos

        logger.info('Formulario eliminado exitosamente:', {
            formId: id,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Formulario eliminado exitosamente',
            data: {
                formId: id,
                deletedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error al eliminar formulario:', {
            error: error.message,
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

module.exports = router;
