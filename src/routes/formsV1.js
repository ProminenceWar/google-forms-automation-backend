/**
 * @fileoverview Rutas de formularios v1
 * @description Maneja operaciones CRUD de formularios FSO
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

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
 * GET /api/v1/forms
 * Lista todos los formularios FSO
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

        // Simulación de formularios FSO
        const mockForms = [
            {
                id: 'fso_001',
                orderNumber: 'ORD-2025-001',
                title: 'Instalación Fibra Óptica - Cliente Premium',
                description: 'Instalación de servicio de fibra óptica para cliente corporativo',
                status: 'completed',
                priority: 'high',
                assignedTo: 'tech_001',
                customer: {
                    name: 'Empresa ABC S.A.',
                    address: 'Av. Principal 123, Ciudad',
                    phone: '+1234567890',
                    email: 'contacto@empresaabc.com'
                },
                installation: {
                    type: 'fiber_optic',
                    speed: '1000mbps',
                    equipment: ['ONT-1000', 'Router-Pro', 'Cable-50m'],
                    scheduledDate: '2025-08-20T09:00:00.000Z',
                    completedDate: '2025-08-19T16:30:00.000Z'
                },
                createdBy: 'admin_001',
                createdAt: '2025-08-18T10:00:00.000Z',
                updatedAt: '2025-08-19T16:30:00.000Z',
                metadata: {
                    submissionCount: 1,
                    lastSubmission: '2025-08-19T16:30:00.000Z',
                    estimatedDuration: 240, // minutos
                    actualDuration: 210
                }
            },
            {
                id: 'fso_002',
                orderNumber: 'ORD-2025-002',
                title: 'Mantenimiento Rutinario - Zona Norte',
                description: 'Mantenimiento preventivo de equipos en sector norte',
                status: 'pending',
                priority: 'medium',
                assignedTo: 'tech_002',
                customer: {
                    name: 'Condominio Torres del Norte',
                    address: 'Calle Norte 456, Ciudad',
                    phone: '+1234567891',
                    email: 'admin@torresnorte.com'
                },
                installation: {
                    type: 'maintenance',
                    scope: 'preventive',
                    equipment: ['Switch-24p', 'Patch-Panel', 'Cable-Tester'],
                    scheduledDate: '2025-08-21T14:00:00.000Z',
                    completedDate: null
                },
                createdBy: 'admin_001',
                createdAt: '2025-08-19T08:00:00.000Z',
                updatedAt: '2025-08-19T08:00:00.000Z',
                metadata: {
                    submissionCount: 0,
                    lastSubmission: null,
                    estimatedDuration: 180,
                    actualDuration: null
                }
            }
        ];

        // Aplicar filtros
        let filteredForms = mockForms;

        if (status) {
            filteredForms = filteredForms.filter(form => form.status === status);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredForms = filteredForms.filter(form =>
                form.title.toLowerCase().includes(searchLower) ||
                form.orderNumber.toLowerCase().includes(searchLower) ||
                form.customer.name.toLowerCase().includes(searchLower)
            );
        }

        // Aplicar ordenamiento
        filteredForms.sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];

            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }

            if (sortOrder === 'desc') {
                return valueB > valueA ? 1 : -1;
            } else {
                return valueA > valueB ? 1 : -1;
            }
        });

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedForms = filteredForms.slice(startIndex, endIndex);

        logger.info('Formularios listados exitosamente:', {
            userId: req.user.id,
            total: filteredForms.length,
            returned: paginatedForms.length,
            filters: { status, search },
            page,
            limit
        });

        res.status(200).json({
            success: true,
            message: 'Formularios obtenidos exitosamente',
            data: {
                forms: paginatedForms,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(filteredForms.length / limit),
                    totalForms: filteredForms.length,
                    limit: parseInt(limit)
                },
                summary: {
                    total: mockForms.length,
                    completed: mockForms.filter(f => f.status === 'completed').length,
                    pending: mockForms.filter(f => f.status === 'pending').length,
                    inProgress: mockForms.filter(f => f.status === 'in_progress').length
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

        // Simulación de formulario específico
        const mockForm = {
            id: id,
            orderNumber: `ORD-2025-${id.slice(-3)}`,
            title: 'Instalación Fibra Óptica - Cliente Premium',
            description: 'Instalación de servicio de fibra óptica para cliente corporativo',
            status: 'completed',
            priority: 'high',
            assignedTo: 'tech_001',
            customer: {
                name: 'Empresa ABC S.A.',
                address: 'Av. Principal 123, Ciudad',
                phone: '+1234567890',
                email: 'contacto@empresaabc.com'
            },
            installation: {
                type: 'fiber_optic',
                speed: '1000mbps',
                equipment: ['ONT-1000', 'Router-Pro', 'Cable-50m'],
                scheduledDate: '2025-08-20T09:00:00.000Z',
                completedDate: '2025-08-19T16:30:00.000Z',
                notes: 'Instalación completada sin inconvenientes'
            },
            createdBy: 'admin_001',
            createdAt: '2025-08-18T10:00:00.000Z',
            updatedAt: '2025-08-19T16:30:00.000Z',
            metadata: {
                submissionCount: 1,
                lastSubmission: '2025-08-19T16:30:00.000Z',
                estimatedDuration: 240,
                actualDuration: 210
            },
            history: [
                {
                    action: 'created',
                    timestamp: '2025-08-18T10:00:00.000Z',
                    user: 'admin_001',
                    details: 'Formulario creado'
                },
                {
                    action: 'assigned',
                    timestamp: '2025-08-18T11:00:00.000Z',
                    user: 'admin_001',
                    details: 'Asignado a tech_001'
                },
                {
                    action: 'completed',
                    timestamp: '2025-08-19T16:30:00.000Z',
                    user: 'tech_001',
                    details: 'Instalación completada exitosamente'
                }
            ],
            files: [
                {
                    id: 'file_001',
                    name: 'Formulario_FSO_001.pdf',
                    type: 'application/pdf',
                    size: 2048576,
                    uploadedAt: '2025-08-19T16:30:00.000Z'
                }
            ]
        };

        logger.info('Formulario obtenido exitosamente:', {
            formId: id,
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Formulario obtenido exitosamente',
            data: {
                form: mockForm
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
