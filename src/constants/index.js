/**
 * @fileoverview Constantes de la aplicación
 * @description Define constantes generales utilizadas en toda la aplicación
 */

module.exports = {
    // Estados de formularios FSO
    FSO_STATES: {
        PENDING: 'pendiente',
        COMPLETED: 'completado',
        REVIEWED: 'revisado',
        ARCHIVED: 'archivado'
    },

    // Tipos de FSO
    FSO_TYPES: {
        FIBER_INSTALLATION: 'Instalación Fibra',
        FIBER_REPAIR: 'Reparación Fibra',
        COPPER_INSTALLATION: 'Instalación Cobre',
        COPPER_REPAIR: 'Reparación Cobre',
        INSPECTION: 'Inspección'
    },

    // Roles de usuario
    USER_ROLES: {
        TECHNICIAN: 'tecnico',
        SUPERVISOR: 'supervisor',
        ADMIN: 'admin'
    },

    // Tipos de archivo permitidos
    FILE_TYPES: {
        PDF: 'application/pdf',
        JPG: 'image/jpeg',
        PNG: 'image/png',
        DOC: 'application/msword',
        DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    },

    // Extensiones de archivo permitidas
    ALLOWED_EXTENSIONS: [
        'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'
    ],

    // Tamaños máximos de archivo (en bytes)
    FILE_SIZE_LIMITS: {
        PDF: 10 * 1024 * 1024, // 10MB
        IMAGE: 5 * 1024 * 1024, // 5MB
        DOCUMENT: 10 * 1024 * 1024 // 10MB
    },

    // Tipos de reporte PDF
    REPORT_TYPES: {
        COMPLETE: 'completo',
        SUMMARY: 'resumen',
        CERTIFICATION: 'certificacion'
    },

    // Plantillas de reporte
    REPORT_TEMPLATES: {
        STANDARD: 'standard',
        DETAILED: 'detallada',
        CERTIFICATION: 'certificacion'
    },

    // Tipos de notificación
    NOTIFICATION_TYPES: {
        EMAIL: 'email',
        PUSH: 'push',
        SMS: 'sms',
        WEBHOOK: 'webhook'
    },

    // Configuración de paginación
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100
    },

    // Configuración de rate limiting
    RATE_LIMITS: {
        GENERAL: {
            WINDOW_MS: 60 * 1000, // 1 minuto
            MAX_REQUESTS: 100
        },
        AUTH: {
            WINDOW_MS: 60 * 60 * 1000, // 1 hora
            MAX_REQUESTS: 1000
        },
        UPLOAD: {
            WINDOW_MS: 60 * 1000, // 1 minuto
            MAX_REQUESTS: 10
        }
    },

    // Configuración de JWT
    JWT_CONFIG: {
        ACCESS_TOKEN_EXPIRY: '1h',
        REFRESH_TOKEN_EXPIRY: '30d'
    },

    // Headers de API
    API_HEADERS: {
        VERSION: 'X-API-Version',
        REQUEST_ID: 'X-Request-ID',
        CONTENT_TYPE: 'Content-Type',
        AUTHORIZATION: 'Authorization'
    },

    // Configuración de logs
    LOG_LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    },

    // Configuración de cache
    CACHE_KEYS: {
        USER_SESSION: 'user_session',
        FORM_DATA: 'form_data',
        FILE_METADATA: 'file_metadata',
        DASHBOARD_STATS: 'dashboard_stats'
    },

    // Tiempos de cache (en segundos)
    CACHE_TTL: {
        SHORT: 300, // 5 minutos
        MEDIUM: 1800, // 30 minutos
        LONG: 3600 // 1 hora
    },

    // Configuración de exportación
    EXPORT_FORMATS: {
        CSV: 'csv',
        EXCEL: 'excel',
        JSON: 'json',
        PDF: 'pdf'
    },

    // Tipos de procesamiento de PDF
    PDF_PROCESSING: {
        EXTRACT_TEXT: 'extract_text',
        EXTRACT_TABLES: 'extract_tables',
        EXTRACT_FIELDS: 'extract_fields',
        RECOGNIZE_SIGNATURES: 'recognize_signatures'
    },

    // Métricas del sistema
    METRICS: {
        FORM_COMPLETION_TIME: 'form_completion_time',
        API_RESPONSE_TIME: 'api_response_time',
        FILE_PROCESSING_TIME: 'file_processing_time',
        ERROR_RATE: 'error_rate'
    },

    // Configuración de health check
    HEALTH_CHECK: {
        INTERVAL: 30000, // 30 segundos
        TIMEOUT: 5000 // 5 segundos
    }
};
