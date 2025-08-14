// app.js
// Archivo principal de la aplicación

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar configuración y utilidades
const config = require('./config');
const logger = require('./utils/logger');

// Importar middleware
const { 
    errorHandler, 
    notFoundHandler, 
    jsonErrorHandler 
} = require('./middleware/errorHandler');

// Importar rutas
const sessionRoutes = require('./routes/session');
const formRoutes = require('./routes/forms');

// Crear aplicación Express
const app = express();

// Configurar rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later',
            type: 'RATE_LIMIT_EXCEEDED',
            retryAfter: config.rateLimit.windowMs / 1000
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
                retryAfter: config.rateLimit.windowMs / 1000,
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

// Health check endpoint
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
        endpoints: {
            session: {
                'POST /api/session/login': 'Inicia el proceso de login manual en Google',
                'GET /api/session/status': 'Verifica el estado de la sesión',
                'POST /api/session/logout': 'Cierra la sesión actual',
                'POST /api/session/refresh': 'Actualiza la actividad de la sesión'
            },
            forms: {
                'POST /api/forms/submit': 'Envía datos al formulario de Google',
                'GET /api/forms/mock-data': 'Obtiene datos de prueba',
                'GET /api/forms/validate-url': 'Valida URL de formulario',
                'POST /api/forms/test-submit': 'Prueba de envío con datos mock'
            },
            utilities: {
                'GET /health': 'Health check del servidor',
                'GET /api': 'Documentación de la API'
            }
        },
        documentation: 'Para más detalles, consulta el README.md del proyecto'
    });
});

// Rutas de la API
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
