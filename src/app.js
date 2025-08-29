// app.js
// Archivo principal de la aplicación

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Importar configuración y utilidades
const config = require('./config');
const logger = require('./utils/logger');
const { swaggerSpec, swaggerOptions } = require('./config/swagger');
const Database = require('./database/connection');

// Importar middleware
const {
    errorHandler,
    notFoundHandler,
    jsonErrorHandler
} = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/auth');
const authV2Routes = require('./routes/authV2'); // Nuevas rutas de autenticación
const sessionRoutes = require('./routes/session');
const formRoutes = require('./routes/forms');
const formsV1Routes = require('./routes/formsV1');
const filesV1Routes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const adminTokensRoutes = require('./routes/adminTokens'); // Rutas admin para tokens
const fsoStatsRoutes = require('./routes/fsoStats');

// Importar middleware de mantenimiento de tokens
const TokenMaintenanceMiddleware = require('./middleware/tokenMaintenance');

// Crear aplicación Express
const app = express();

// Configurar rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.general?.windowMs || 60000,
    max: config.rateLimit.general?.maxRequests || 100,
    // Deshabilitar rate limiting en desarrollo para pruebas
    skip: (req) => {
        return process.env.NODE_ENV === 'development' &&
            req.headers['user-agent']?.includes('superagent');
    },
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later',
            type: 'RATE_LIMIT_EXCEEDED',
            retryAfter: (config.rateLimit.general?.windowMs || 60000) / 1000
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded:', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent')
        });

        res.status(429).json({
            success: false,
            error: {
                message: 'Too many requests from this IP, please try again later',
                type: 'RATE_LIMIT_EXCEEDED',
                retryAfter: (config.rateLimit.general?.windowMs || 60000) / 1000,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com'] // Cambiar por dominios permitidos en producción
        : true, // Permitir todos los orígenes en desarrollo
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate limiting
app.use(limiter);

// Body parsing middleware
app.use(express.json({
    limit: '10mb',
    strict: true
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// Middleware para logging de requests
app.use((req, res, next) => {
    logger.info('Incoming request:', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

// Middleware para manejo de errores de JSON
app.use(jsonErrorHandler);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Información general de la API
 *     description: Endpoint raíz que proporciona información básica sobre la API y enlaces a documentación
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Información de la API obtenida exitosamente
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
 *                   example: "Google Forms Automation Backend"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 documentation:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: "/api/v1/health"
 *                     api:
 *                       type: string
 *                       example: "/api/v1"
 *                     endpoints:
 *                       type: string
 *                       example: "/api/docs"
 */
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Google Forms Automation Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
        documentation: {
            health: '/api/v1/health',
            api: '/api/v1',
            swagger: '/api/docs'
        }
    });
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Verificación de salud del sistema
 *     description: Endpoint para verificar el estado de salud de la API y sus servicios
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Sistema saludable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Problemas de salud detectados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/v1/health', async (req, res) => {
    try {
        // Aquí puedes agregar verificaciones de salud más detalladas
        // Por ejemplo, verificar conexión a base de datos

        res.status(200).json({
            success: true,
            message: 'Sistema operativo y saludable',
            data: {
                status: 'healthy',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                environment: config.server.nodeEnv,
                uptime: process.uptime(),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                services: {
                    database: 'connected', // En producción verificar conexión real
                    api: 'operational',
                    authentication: 'operational'
                }
            }
        });
    } catch (error) {
        logger.error('Error en health check:', error);
        res.status(503).json({
            success: false,
            message: 'Problemas de salud detectados',
            error: {
                message: 'Error interno del servidor',
                type: 'HEALTH_CHECK_FAILED'
            }
        });
    }
});

// Health check endpoint (legacy)
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Google Forms Automation Backend is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
        uptime: process.uptime()
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Google Forms Automation API',
        version: '1.0.0',
        documentation: {
            swagger: {
                ui: '/api/docs',
                json: '/api/docs.json',
                description: 'Documentación interactiva completa con Swagger UI'
            },
            endpoints: {
                health: '/api/v1/health',
                authentication: '/api/v1/auth',
                forms: '/api/v1/forms',
                files: '/api/v1/files',
                sessions: '/api/v1/sessions'
            }
        },
        endpoints: {
            'v1': {
                auth: {
                    'POST /api/v1/auth/login': 'Iniciar sesión con JWT',
                    'GET /api/v1/auth/profile': 'Obtener perfil de usuario',
                    'POST /api/v1/auth/register': 'Registrar nuevo usuario',
                    'POST /api/v1/auth/refresh': 'Renovar token JWT',
                    'POST /api/v1/auth/logout': 'Cerrar sesión'
                },
                forms: {
                    'GET /api/v1/forms': 'Listar formularios FSO',
                    'POST /api/v1/forms': 'Crear formulario FSO',
                    'GET /api/v1/forms/:id': 'Obtener formulario específico',
                    'PUT /api/v1/forms/:id': 'Actualizar formulario',
                    'DELETE /api/v1/forms/:id': 'Eliminar formulario'
                },
                files: {
                    'GET /api/v1/files': 'Listar archivos',
                    'POST /api/v1/files/upload': 'Subir archivo',
                    'GET /api/v1/files/:id': 'Obtener archivo específico',
                    'DELETE /api/v1/files/:id': 'Eliminar archivo'
                },
                sessions: {
                    'GET /api/v1/sessions/active': 'Obtener sesiones activas'
                },
                admin: {
                    'GET /api/admin/dashboard/stats': 'Estadísticas del dashboard',
                    'GET /api/admin/export/forms/csv': 'Exportar formularios CSV',
                    'GET /api/admin/export/forms/excel': 'Exportar formularios Excel',
                    'GET /api/admin/config/system': 'Configuración del sistema',
                    'GET /api/admin/reports/forms/pdf': 'Reporte de formularios PDF'
                },
                system: {
                    'GET /api/v1/health': 'Verificación de salud',
                    'GET /': 'Información general de la API'
                }
            },
            legacy: {
                'POST /api/session/login': 'Login manual (legacy)',
                'GET /api/session/status': 'Estado de sesión (legacy)',
                'POST /api/forms/submit': 'Envío de formularios (legacy)'
            }
        },
        message: '📋 Para documentación completa visita: /api/docs'
    });
});

// Rutas de la API v1
app.use('/api/v1/auth', authRoutes); // Auth legacy
app.use('/api/auth', authV2Routes); // Nuevas rutas de autenticación con refresh tokens
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/forms', formsV1Routes);
app.use('/api/v1/files', filesV1Routes);
app.use('/api/v1/fso', fsoStatsRoutes); // Rutas específicas para estadísticas FSO

// Rutas administrativas
app.use('/api/admin', adminRoutes);
app.use('/api/admin/tokens', adminTokensRoutes); // Gestión administrativa de tokens

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Endpoint para obtener especificación OpenAPI en JSON
app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Rutas legacy (mantener compatibilidad)
app.use('/api/session', sessionRoutes);
app.use('/api/forms', formRoutes);

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Función para inicializar la aplicación
async function initializeApp() {
    try {
        // Inicializar servicios si es necesario
        logger.info('Initializing application...');

        // Conectar a la base de datos
        const database = new Database();
        await database.connect();
        logger.info('Database connected successfully');

        // Aquí se pueden agregar inicializaciones adicionales si es necesario
        // Por ejemplo, inicializar servicios, conectar a bases de datos, etc.

        logger.info('Application initialized successfully');
        return true;
    } catch (error) {
        logger.error('Error initializing application:', error);
        throw error;
    }
}

// Función para iniciar el servidor
async function startServer() {
    try {
        await initializeApp();

        // Inicializar tareas de mantenimiento de tokens
        TokenMaintenanceMiddleware.init();
        logger.info('Token maintenance tasks initialized');

        const server = app.listen(config.server.port, () => {
            logger.info(`Server started successfully`, {
                port: config.server.port,
                environment: config.server.nodeEnv,
                nodeVersion: process.version,
                timestamp: new Date().toISOString()
            });

            console.log(`🚀 Server running on port ${config.server.port}`);
            console.log(`📱 Health check: http://localhost:${config.server.port}/health`);
            console.log(`📋 API docs: http://localhost:${config.server.port}/api`);
            console.log(`🛠️ swagger UI: http://localhost:${config.server.port}/api/docs`);
            console.log(`🔐 Auth V2 endpoints: http://localhost:${config.server.port}/api/auth`);
            console.log(`⚙️ Admin token management: http://localhost:${config.server.port}/api/admin/tokens`);
        });

        // Manejo de cierre graceful
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        logger.error('Error starting server:', error);
        process.exit(1);
    }
}

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
    startServer();
}

module.exports = app;
