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
            // Configurar opciones de conexión
            const options = {
                ...config.database.options,
                useNewUrlParser: true,
                useUnifiedTopology: true
            };

            // Establecer conexión
            this.connection = await mongoose.connect(config.database.connectionString, options);
            this.isConnected = true;

            logger.info('Conexión a MongoDB establecida exitosamente', {
                database: config.database.name,
                host: config.database.host,
                port: config.database.port
            });

            // Configurar event listeners
            this.setupEventListeners();

            return this.connection;
        } catch (error) {
            logger.error('Error al conectar a MongoDB:', error);
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
            logger.info('Mongoose conectado a MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Error de conexión de Mongoose:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose desconectado de MongoDB');
            this.isConnected = false;
        });

        // Reconectarse automáticamente en caso de pérdida de conexión
        mongoose.connection.on('reconnected', () => {
            logger.info('Mongoose reconectado a MongoDB');
            this.isConnected = true;
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
     * @returns {Promise<Object>}
     */
    async healthCheck() {
        try {
            if (!this.isConnectionActive()) {
                throw new Error('Base de datos no conectada');
            }

            // Ejecutar un comando simple para verificar la conexión
            const admin = mongoose.connection.db.admin();
            const result = await admin.ping();

            return {
                status: 'healthy',
                connected: true,
                ping: result.ok === 1,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Limpia y optimiza la base de datos
     * @returns {Promise<Object>}
     */
    async cleanup() {
        try {
            const stats = await mongoose.connection.db.stats();
            logger.info('Estadísticas de la base de datos:', stats);

            // Aquí puedes agregar lógica de limpieza adicional
            // Por ejemplo, eliminar registros antiguos, optimizar índices, etc.

            return {
                success: true,
                message: 'Limpieza de base de datos completada',
                stats
            };
        } catch (error) {
            logger.error('Error durante la limpieza de base de datos:', error);
            throw error;
        }
    }
}

// Crear instancia singleton
const database = new Database();

module.exports = database;
