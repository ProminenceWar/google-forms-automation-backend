// errorHandler.js
// Middleware para manejo de errores

const logger = require('../utils/logger');

/**
 * Middleware para manejo centralizado de errores
 */
const errorHandler = (err, req, res, next) => {
    // Log del error completo
    logger.error('Error caught by error handler:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Determinar el status code
    let statusCode = err.statusCode || err.status || 500;
    
    // Asegurar que el status code es válido
    if (statusCode < 400 || statusCode > 599) {
        statusCode = 500;
    }

    // Estructura base de respuesta de error
    const errorResponse = {
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            status: statusCode,
            timestamp: new Date().toISOString()
        }
    };

    // Agregar detalles adicionales según el tipo de error
    switch (err.name) {
        case 'ValidationError':
            statusCode = 400;
            errorResponse.error.type = 'VALIDATION_ERROR';
            errorResponse.error.details = err.details || {};
            break;

        case 'UnauthorizedError':
        case 'JsonWebTokenError':
            statusCode = 401;
            errorResponse.error.type = 'AUTHENTICATION_ERROR';
            errorResponse.error.message = 'Authentication required';
            break;

        case 'ForbiddenError':
            statusCode = 403;
            errorResponse.error.type = 'AUTHORIZATION_ERROR';
            errorResponse.error.message = 'Access forbidden';
            break;

        case 'NotFoundError':
            statusCode = 404;
            errorResponse.error.type = 'NOT_FOUND_ERROR';
            break;

        case 'TimeoutError':
            statusCode = 408;
            errorResponse.error.type = 'TIMEOUT_ERROR';
            errorResponse.error.message = 'Request timeout';
            break;

        case 'PayloadTooLargeError':
            statusCode = 413;
            errorResponse.error.type = 'PAYLOAD_TOO_LARGE';
            break;

        case 'TooManyRequestsError':
            statusCode = 429;
            errorResponse.error.type = 'RATE_LIMIT_EXCEEDED';
            errorResponse.error.message = 'Too many requests';
            break;

        default:
            // Errores específicos de Puppeteer
            if (err.message.includes('Navigation timeout')) {
                statusCode = 408;
                errorResponse.error.type = 'NAVIGATION_TIMEOUT';
                errorResponse.error.message = 'Browser navigation timeout';
            } else if (err.message.includes('Protocol error')) {
                statusCode = 502;
                errorResponse.error.type = 'BROWSER_ERROR';
                errorResponse.error.message = 'Browser protocol error';
            } else if (err.message.includes('Target closed')) {
                statusCode = 503;
                errorResponse.error.type = 'BROWSER_UNAVAILABLE';
                errorResponse.error.message = 'Browser instance unavailable';
            } else {
                errorResponse.error.type = 'INTERNAL_ERROR';
            }
            break;
    }

    // En desarrollo, incluir stack trace y detalles adicionales
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
        errorResponse.error.details = {
            name: err.name,
            code: err.code,
            originalMessage: err.message
        };
    }

    // Para errores de rate limiting, agregar headers informativos
    if (statusCode === 429) {
        res.set({
            'Retry-After': '900', // 15 minutos
            'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString()
        });
    }

    // Enviar respuesta de error
    res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para manejo de rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
    const error = {
        message: `Route ${req.method} ${req.url} not found`,
        status: 404,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'POST /api/session/login',
            'GET /api/session/status',
            'POST /api/session/logout',
            'POST /api/session/refresh',
            'POST /api/forms/submit',
            'GET /api/forms/mock-data',
            'GET /api/forms/validate-url',
            'POST /api/forms/test-submit'
        ]
    };

    logger.warn('Route not found:', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        error
    });
};

/**
 * Wrapper para funciones async que maneja errores automáticamente
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware para validación de JSON
 */
const jsonErrorHandler = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.warn('Invalid JSON received:', {
            url: req.url,
            method: req.method,
            ip: req.ip,
            error: err.message
        });

        return res.status(400).json({
            success: false,
            error: {
                message: 'Invalid JSON in request body',
                type: 'JSON_PARSE_ERROR',
                status: 400,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    jsonErrorHandler
};
