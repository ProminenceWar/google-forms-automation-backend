/**
 * @fileoverview Configuración de Swagger/OpenAPI
 * @description Configuración centralizada para la documentación automática de la API
 */

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Google Forms Automation API',
            version: '1.0.0',
            description: 'API completa para automatización de formularios FSO con Google Forms',
            contact: {
                name: 'FSO Automation Team',
                email: 'admin@fso-automation.com',
                url: 'https://github.com/ProminenceWar/google-forms-automation-backend'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor de desarrollo'
            },
            {
                url: 'https://api.fso-automation.com',
                description: 'Servidor de producción'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT para autenticación. Formato: Bearer <token>'
                }
            },
            schemas: {
                // Esquemas de Error
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Error interno del servidor'
                                },
                                type: {
                                    type: 'string',
                                    example: 'INTERNAL_ERROR'
                                },
                                details: {
                                    type: 'array',
                                    items: {
                                        type: 'object'
                                    }
                                }
                            }
                        }
                    }
                },
                // Esquema de Usuario
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: '1'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'admin@fso-automation.com'
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'technician', 'user'],
                            example: 'admin'
                        },
                        profile: {
                            type: 'object',
                            properties: {
                                firstName: {
                                    type: 'string',
                                    example: 'Pablo'
                                },
                                lastName: {
                                    type: 'string',
                                    example: 'García'
                                },
                                phone: {
                                    type: 'string',
                                    example: '+52 555 123 4567'
                                },
                                position: {
                                    type: 'string',
                                    example: 'Administrador de Sistema'
                                }
                            }
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-19T20:00:00.000Z'
                        }
                    }
                },
                // Esquema de Formulario FSO
                FormFSO: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'fso_001'
                        },
                        orderNumber: {
                            type: 'string',
                            example: 'ORD-2025-001'
                        },
                        title: {
                            type: 'string',
                            example: 'Instalación Fibra Óptica - Cliente Premium'
                        },
                        description: {
                            type: 'string',
                            example: 'Instalación de servicio de fibra óptica para cliente corporativo'
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
                            example: 'completed'
                        },
                        priority: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'urgent'],
                            example: 'high'
                        },
                        customer: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    example: 'Empresa ABC S.A.'
                                },
                                address: {
                                    type: 'string',
                                    example: 'Av. Principal 123, Ciudad'
                                },
                                phone: {
                                    type: 'string',
                                    example: '+1234567890'
                                },
                                email: {
                                    type: 'string',
                                    format: 'email',
                                    example: 'contacto@empresaabc.com'
                                }
                            }
                        },
                        installation: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['fiber_optic', 'maintenance', 'repair', 'upgrade'],
                                    example: 'fiber_optic'
                                },
                                speed: {
                                    type: 'string',
                                    example: '1000mbps'
                                },
                                equipment: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    },
                                    example: ['ONT-1000', 'Router-Pro', 'Cable-50m']
                                },
                                scheduledDate: {
                                    type: 'string',
                                    format: 'date-time',
                                    example: '2025-08-20T09:00:00.000Z'
                                },
                                completedDate: {
                                    type: 'string',
                                    format: 'date-time',
                                    nullable: true,
                                    example: '2025-08-19T16:30:00.000Z'
                                }
                            }
                        },
                        assignedTo: {
                            type: 'string',
                            nullable: true,
                            example: 'tech_001'
                        },
                        createdBy: {
                            type: 'string',
                            example: 'admin_001'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-18T10:00:00.000Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-19T16:30:00.000Z'
                        }
                    }
                },
                // Esquema de Archivo
                File: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'file_001'
                        },
                        name: {
                            type: 'string',
                            example: 'Formulario_FSO_001.pdf'
                        },
                        originalName: {
                            type: 'string',
                            example: 'Formulario FSO - Orden 001.pdf'
                        },
                        size: {
                            type: 'integer',
                            example: 2048576
                        },
                        mimeType: {
                            type: 'string',
                            example: 'application/pdf'
                        },
                        category: {
                            type: 'string',
                            example: 'fso-form'
                        },
                        uploadedBy: {
                            type: 'string',
                            example: 'admin_001'
                        },
                        uploadedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-19T20:00:00.000Z'
                        },
                        url: {
                            type: 'string',
                            example: '/files/file_001.pdf'
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                formId: {
                                    type: 'string',
                                    example: 'fso_001'
                                },
                                processed: {
                                    type: 'boolean',
                                    example: true
                                }
                            }
                        }
                    }
                },
                // Esquema de Sesión
                Session: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'session_001'
                        },
                        userId: {
                            type: 'string',
                            example: 'admin_001'
                        },
                        type: {
                            type: 'string',
                            enum: ['manual', 'automated'],
                            example: 'automated'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'expired', 'terminated'],
                            example: 'active'
                        },
                        startTime: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-19T20:00:00.000Z'
                        },
                        lastActivity: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-19T20:30:00.000Z'
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                userAgent: {
                                    type: 'string',
                                    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                                },
                                ipAddress: {
                                    type: 'string',
                                    example: '192.168.1.100'
                                }
                            }
                        }
                    }
                },
                // Esquemas de respuesta estándar
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operación exitosa'
                        },
                        data: {
                            type: 'object'
                        }
                    }
                },
                PaginationResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Datos obtenidos exitosamente'
                        },
                        data: {
                            type: 'object',
                            properties: {
                                pagination: {
                                    type: 'object',
                                    properties: {
                                        currentPage: {
                                            type: 'integer',
                                            example: 1
                                        },
                                        totalPages: {
                                            type: 'integer',
                                            example: 5
                                        },
                                        totalItems: {
                                            type: 'integer',
                                            example: 50
                                        },
                                        limit: {
                                            type: 'integer',
                                            example: 10
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                HealthCheck: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Sistema operativo y saludable'
                        },
                        data: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    example: 'healthy'
                                },
                                version: {
                                    type: 'string',
                                    example: '1.0.0'
                                },
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                    example: '2025-08-19T20:00:00.000Z'
                                },
                                uptime: {
                                    type: 'number',
                                    example: 3600.45
                                },
                                environment: {
                                    type: 'string',
                                    example: 'development'
                                },
                                services: {
                                    type: 'object',
                                    properties: {
                                        database: {
                                            type: 'string',
                                            example: 'connected'
                                        },
                                        api: {
                                            type: 'string',
                                            example: 'operational'
                                        },
                                        authentication: {
                                            type: 'string',
                                            example: 'operational'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Sistema',
                description: 'Endpoints de salud y estado del sistema'
            },
            {
                name: 'Autenticación',
                description: 'Gestión de autenticación y autorización JWT'
            },
            {
                name: 'Formularios FSO',
                description: 'Operaciones CRUD para formularios de órdenes de servicio'
            },
            {
                name: 'Archivos',
                description: 'Gestión de archivos y documentos'
            },
            {
                name: 'Sesiones',
                description: 'Administración de sesiones de usuario'
            }
        ]
    },
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../controllers/*.js'),
        path.join(__dirname, '../app.js')
    ]
};

const specs = swaggerJsdoc(options);

module.exports = {
    swaggerSpec: specs,
    swaggerOptions: {
        explorer: true,
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #2196F3; }
            .swagger-ui .scheme-container { background: #fafafa; }
        `,
        customSiteTitle: 'FSO Automation API - Documentación',
        customfavIcon: '/favicon.ico',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true
        }
    }
};
