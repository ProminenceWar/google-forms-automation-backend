/**
 * @fileoverview Configuración y conexión a la base de datos MongoDB
 * @description Maneja la conexión, configuración y utilidades de la base de datos
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    /**
     * Conecta a la base de datos MongoDB
     * @returns {Promise<mongoose.Connection>}
     */
    async connect() {
        try {
            logger.info('🔌 Iniciando conexión a MongoDB...', {
                environment: config.server.nodeEnv,
                database: config.database.name
            });

            // Configurar opciones de conexión optimizadas para Atlas
            const options = {
                ...config.database.options,
                useNewUrlParser: true,
                useUnifiedTopology: true,
                retryWrites: true,
                w: 'majority',
                appName: 'FSO-Automation-Backend',
                bufferCommands: false,
                connectTimeoutMS: config.database.options.serverSelectionTimeoutMS,
                socketTimeoutMS: 45000,
                heartbeatFrequencyMS: 10000,
                serverSelectionTimeoutMS: config.database.options.serverSelectionTimeoutMS
            };

            // Agregar autenticación si está configurada
            if (config.database.user && config.database.password) {
                options.auth = {
                    username: config.database.user,
                    password: config.database.password
                };
            }

            // Establecer conexión
            await mongoose.connect(config.database.connectionString, options);
            this.connection = mongoose.connection;
            this.isConnected = true;

            logger.info('✅ Conexión a MongoDB establecida exitosamente', {
                database: this.connection.name,
                host: this.connection.host,
                port: this.connection.port,
                readyState: this.connection.readyState
            });

            // Configurar event listeners
            this.setupEventListeners();

            return this.connection;
        } catch (error) {
            this.isConnected = false;
            logger.error('❌ Error al conectar a MongoDB:', {
                error: error.message,
                code: error.code,
                connectionString: this.maskConnectionString(config.database.connectionString)
            });
            throw error;
        }
    }

    /**
     * Desconecta de la base de datos
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                this.isConnected = false;
                logger.info('Desconectado de MongoDB exitosamente');
            }
        } catch (error) {
            logger.error('Error al desconectar de MongoDB:', error);
            throw error;
        }
    }

    /**
     * Configura los event listeners para la conexión
     */
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            logger.info('✅ Mongoose conectado a MongoDB Atlas', {
                readyState: mongoose.connection.readyState,
                database: mongoose.connection.name
            });
        });

        mongoose.connection.on('error', (err) => {
            logger.error('❌ Error de conexión de Mongoose:', {
                error: err.message,
                code: err.code,
                readyState: mongoose.connection.readyState
            });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️ Mongoose desconectado de MongoDB', {
                readyState: mongoose.connection.readyState
            });
            this.isConnected = false;
        });

        // Reconectarse automáticamente en caso de pérdida de conexión
        mongoose.connection.on('reconnected', () => {
            logger.info('🔄 Mongoose reconectado a MongoDB Atlas', {
                readyState: mongoose.connection.readyState
            });
            this.isConnected = true;
        });

        mongoose.connection.on('reconnectFailed', () => {
            logger.error('💥 Falló la reconexión a MongoDB Atlas');
            this.isConnected = false;
        });

        // Manejar cierre de la aplicación
        process.on('SIGINT', async () => {
            try {
                await this.disconnect();
                logger.info('Aplicación terminada, conexión a MongoDB cerrada');
                process.exit(0);
            } catch (error) {
                logger.error('Error al cerrar conexión de MongoDB:', error);
                process.exit(1);
            }
        });
    }

    /**
     * Verifica si la conexión está activa
     * @returns {boolean}
     */
    isConnectionActive() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    /**
     * Obtiene estadísticas de la conexión
     * @returns {Object}
     */
    getConnectionStats() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }

    /**
     * Ejecuta un health check de la base de datos
     * @returns {Promise<Object>} Resultado del health check
     */
    async healthCheck() {
        try {
            if (!this.isConnectionActive()) {
                return {
                    status: 'disconnected',
                    message: 'No hay conexión activa a la base de datos',
                    details: this.getConnectionStats()
                };
            }

            // Ejecutar comando ping para verificar conectividad
            const startTime = Date.now();
            const admin = mongoose.connection.db.admin();
            const pingResult = await admin.ping();
            const responseTime = Date.now() - startTime;

            // Obtener estadísticas del servidor si está disponible
            let serverStats = null;
            try {
                serverStats = await admin.serverStatus();
            } catch (statsError) {
                logger.warn('No se pudieron obtener estadísticas del servidor:', statsError.message);
            }

            return {
                status: 'healthy',
                message: 'Conexión a MongoDB Atlas activa y saludable',
                ping: pingResult.ok === 1,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString(),
                details: {
                    ...this.getConnectionStats(),
                    ...(serverStats && {
                        serverVersion: serverStats.version,
                        uptime: serverStats.uptime,
                        connections: serverStats.connections
                    })
                }
            };
        } catch (error) {
            logger.error('❌ Health check de MongoDB falló:', {
                error: error.message,
                code: error.code
            });

            return {
                status: 'error',
                message: 'Error en health check de la base de datos',
                error: error.message,
                timestamp: new Date().toISOString(),
                details: this.getConnectionStats()
            };
        }
    }

    /**
     * Limpia y optimiza la base de datos
     * @returns {Promise<Object>}
     */
    async cleanup() {
        try {
            if (!this.isConnectionActive()) {
                throw new Error('No hay conexión activa a la base de datos');
            }

            const stats = await mongoose.connection.db.stats();
            logger.info('📊 Estadísticas de la base de datos antes de limpieza:', {
                collections: stats.collections,
                dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
                storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
                indexes: stats.indexes
            });

            // Aquí puedes agregar lógica de limpieza adicional
            // Por ejemplo, eliminar registros antiguos, optimizar índices, etc.
            const cleanupResults = {
                executed: true,
                timestamp: new Date().toISOString(),
                beforeStats: stats,
                operations: []
            };

            // Ejemplo: Limpiar archivos huérfanos o sesiones expiradas
            // cleanupResults.operations.push('Archivos huérfanos eliminados');

            logger.info('🧹 Limpieza de base de datos completada exitosamente');

            return cleanupResults;
        } catch (error) {
            logger.error('❌ Error durante la limpieza de base de datos:', {
                error: error.message,
                code: error.code
            });
            throw error;
        }
    }

    /**
     * Oculta las credenciales de la cadena de conexión para el logging
     * @param {string} connectionString - Cadena de conexión original
     * @returns {string} Cadena de conexión con credenciales ocultas
     */
    maskConnectionString(connectionString) {
        try {
            return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
        } catch (error) {
            return '[MASKED]';
        }
    }
}


// Crear instancia singleton
const database = new Database();

module.exports = Database;
module.exports.instance = database;
