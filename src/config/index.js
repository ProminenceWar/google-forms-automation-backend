/**
 * @fileoverview Configuración principal de la aplicación
 * @description Centraliza toda la configuración del sistema usando variables de entorno
 */

require('dotenv').config();

const config = {
    // Configuración del servidor
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        apiVersion: process.env.API_VERSION || 'v1',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001'
    },

    // Configuración de base de datos
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 27017,
        name: process.env.DB_NAME || 'google_forms_automation',
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        connectionString: process.env.DB_CONNECTION_STRING || 'mongodb://localhost:27017/google_forms_automation',
        options: {
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
            minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 5,
            serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000
        }
    },

    // Configuración de JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    },

    // Configuración de encriptación
    encryption: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
        key: process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this'
    },

    // Configuración de rate limiting
    rateLimit: {
        general: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
            skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
        },
        auth: {
            windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 3600000,
            maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS) || 1000
        },
        upload: {
            windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 60000,
            maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX_REQUESTS) || 10
        }
    },

    // Configuración de almacenamiento
    storage: {
        type: process.env.STORAGE_TYPE || 'local',
        path: process.env.STORAGE_PATH || './storage',
        baseUrl: process.env.STORAGE_BASE_URL || 'http://localhost:3000/files',
        aws: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1',
            bucket: process.env.AWS_S3_BUCKET
        },
        gcs: {
            projectId: process.env.GCS_PROJECT_ID,
            bucketName: process.env.GCS_BUCKET_NAME,
            keyFile: process.env.GCS_KEY_FILE
        }
    },

    // Configuración de archivos
    files: {
        maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'jpg', 'jpeg', 'png'],
        retentionDays: parseInt(process.env.FILE_RETENTION_DAYS) || 365
    },

    // Configuración de email
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: {
            name: process.env.EMAIL_FROM_NAME || 'FSO Automation System',
            address: process.env.EMAIL_FROM_ADDRESS || 'noreply@fso-automation.com'
        },
        templatesPath: process.env.EMAIL_TEMPLATES_PATH || './src/templates/email'
    },

    // Configuración de Google Forms
    googleForms: {
        formUrl: process.env.GOOGLE_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSexample/viewform',
        baseUrl: process.env.GOOGLE_FORMS_BASE_URL || 'https://docs.google.com/forms'
    },

    // Configuración de Puppeteer
    puppeteer: {
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000,
        viewport: {
            width: parseInt(process.env.PUPPETEER_VIEWPORT_WIDTH) || 1366,
            height: parseInt(process.env.PUPPETEER_VIEWPORT_HEIGHT) || 768
        },
        userAgent: process.env.PUPPETEER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        executablePath: process.env.CHROME_EXECUTABLE_PATH,
        userDataDir: './sessions/chrome-profile'
    },

    // Configuración de sesiones
    session: {
        timeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour
        maxAge: parseInt(process.env.MAX_SESSION_AGE) || 86400000, // 24 hours
        filePath: './sessions/session.json'
    },

    // Configuración de logs
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
        datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
    },

    // Configuración de PDF
    pdf: {
        quality: process.env.PDF_QUALITY || 'high',
        dpi: parseInt(process.env.PDF_DPI) || 300,
        maxPages: parseInt(process.env.PDF_MAX_PAGES) || 50,
        timeout: parseInt(process.env.PDF_TIMEOUT) || 60000
    },

    // Configuración de OCR
    ocr: {
        language: process.env.OCR_LANGUAGE || 'spa+eng',
        confidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.7
    },

    // Configuración de notificaciones
    notifications: {
        enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
        email: process.env.EMAIL_NOTIFICATIONS === 'true',
        push: process.env.PUSH_NOTIFICATIONS === 'true',
        sms: process.env.SMS_NOTIFICATIONS === 'true',
        webhook: {
            url: process.env.WEBHOOK_URL,
            secret: process.env.WEBHOOK_SECRET
        }
    },

    // Configuración de CORS
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-API-Version']
    },

    // Configuración de Redis (si se usa)
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        ttl: parseInt(process.env.REDIS_TTL) || 3600
    },

    // Configuración de cache
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.CACHE_TTL) || 300000
    },

    // Configuración de health check
    healthCheck: {
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
        timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    },

    // Configuración de métricas
    metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        port: parseInt(process.env.METRICS_PORT) || 9090
    }
};

module.exports = config;