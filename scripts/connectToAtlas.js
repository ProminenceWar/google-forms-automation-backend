/**
 * Script para conectar a MongoDB Atlas y ejecutar configuración inicial
 * Este script verifica la conexión, ejecuta el playground y configura la base de datos
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

const Database = require('../src/database/connection');

/**
 * Configuración específica para MongoDB Atlas
 */
class AtlasConnectionManager {
    constructor() {
        this.dbConnection = new Database();
        this.atlasConnectionString = this.buildAtlasConnectionString();
    }

    /**
     * Construye la cadena de conexión para MongoDB Atlas
     * @returns {string} Cadena de conexión completa
     */
    buildAtlasConnectionString() {
        const {
            MONGODB_ATLAS_USERNAME,
            MONGODB_ATLAS_PASSWORD,
            MONGODB_ATLAS_CLUSTER,
            MONGODB_ATLAS_DATABASE,
            MONGODB_ATLAS_RETRY_WRITES = 'true',
            MONGODB_ATLAS_W = 'majority'
        } = process.env;

        // Validar variables requeridas
        if (!MONGODB_ATLAS_USERNAME || !MONGODB_ATLAS_PASSWORD || !MONGODB_ATLAS_CLUSTER) {
            throw new Error('❌ Variables de entorno requeridas para MongoDB Atlas no están configuradas');
        }

        // Construir URI de conexión
        const baseUri = `mongodb+srv://${MONGODB_ATLAS_USERNAME}:${MONGODB_ATLAS_PASSWORD}@${MONGODB_ATLAS_CLUSTER}`;
        const database = MONGODB_ATLAS_DATABASE || 'fso-automation';
        const params = new URLSearchParams({
            retryWrites: MONGODB_ATLAS_RETRY_WRITES,
            w: MONGODB_ATLAS_W,
            appName: 'FSO-Automation-Backend'
        });

        return `${baseUri}/${database}?${params.toString()}`;
    }

    /**
     * Verifica la conexión a MongoDB Atlas
     * @returns {Promise<boolean>} True si la conexión es exitosa
     */
    async testConnection() {
        try {
            logger.info('🔍 Verificando conexión a MongoDB Atlas...');

            // Configurar opciones de conexión específicas para Atlas
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                retryWrites: true,
                w: 'majority',
                appName: 'FSO-Automation-Backend-Test'
            };

            // Intentar conexión
            await mongoose.connect(this.atlasConnectionString, options);

            // Verificar con ping
            const admin = mongoose.connection.db.admin();
            const pingResult = await admin.ping();

            if (pingResult.ok === 1) {
                logger.info('✅ Conexión a MongoDB Atlas exitosa', {
                    cluster: process.env.MONGODB_ATLAS_CLUSTER,
                    database: mongoose.connection.name,
                    readyState: mongoose.connection.readyState
                });
                return true;
            } else {
                throw new Error('Ping falló');
            }
        } catch (error) {
            logger.error('❌ Error al conectar a MongoDB Atlas:', {
                error: error.message,
                code: error.code,
                cluster: process.env.MONGODB_ATLAS_CLUSTER
            });
            return false;
        } finally {
            if (mongoose.connection.readyState === 1) {
                await mongoose.disconnect();
            }
        }
    }

    /**
     * Ejecuta la configuración inicial de la base de datos
     * @returns {Promise<Object>} Resultado de la configuración
     */
    async setupDatabase() {
        try {
            logger.info('🚀 Iniciando configuración de base de datos...');

            // Conectar usando el DatabaseConnection manager
            await this.dbConnection.connect();

            // Verificar que las colecciones existen
            const collections = await mongoose.connection.db.listCollections().toArray();
            const collectionNames = collections.map(col => col.name);

            logger.info('📚 Colecciones existentes:', { collections: collectionNames });

            // Crear colecciones básicas si no existen
            const requiredCollections = ['users', 'fsoforms', 'files'];
            const results = {
                collections: {
                    existing: collectionNames,
                    created: []
                },
                indexes: {
                    created: []
                }
            };

            for (const collectionName of requiredCollections) {
                if (!collectionNames.includes(collectionName)) {
                    await mongoose.connection.db.createCollection(collectionName);
                    results.collections.created.push(collectionName);
                    logger.info(`✅ Colección '${collectionName}' creada`);
                }
            }

            // Configurar índices básicos
            await this.createBasicIndexes(results);

            logger.info('🎉 Configuración de base de datos completada exitosamente');
            return results;

        } catch (error) {
            logger.error('❌ Error durante la configuración de la base de datos:', {
                error: error.message,
                code: error.code
            });
            throw error;
        }
    }

    /**
     * Crea índices básicos para las colecciones
     * @param {Object} results - Objeto para almacenar resultados
     */
    async createBasicIndexes(results) {
        try {
            const db = mongoose.connection.db;

            // Índices para usuarios
            await db.collection('users').createIndex({ email: 1 }, { unique: true });
            await db.collection('users').createIndex({ 'profile.dni': 1 }, { unique: true, sparse: true });
            results.indexes.created.push('users.email', 'users.profile.dni');

            // Índices para formularios FSO
            await db.collection('fsoforms').createIndex({ createdBy: 1 });
            await db.collection('fsoforms').createIndex({ status: 1 });
            await db.collection('fsoforms').createIndex({ createdAt: 1 });
            results.indexes.created.push('fsoforms.createdBy', 'fsoforms.status', 'fsoforms.createdAt');

            // Índices para archivos
            await db.collection('files').createIndex({ uploadedBy: 1 });
            await db.collection('files').createIndex({ originalName: 1 });
            await db.collection('files').createIndex({ uploadedAt: 1 });
            results.indexes.created.push('files.uploadedBy', 'files.originalName', 'files.uploadedAt');

            logger.info('📑 Índices básicos creados exitosamente');
        } catch (error) {
            logger.warn('⚠️ Algunos índices no se pudieron crear (pueden existir):', error.message);
        }
    }

    /**
     * Ejecuta verificaciones de salud de la base de datos
     * @returns {Promise<Object>} Resultado de las verificaciones
     */
    async runHealthChecks() {
        try {
            logger.info('🏥 Ejecutando verificaciones de salud...');

            const healthResult = await this.dbConnection.healthCheck();

            if (healthResult.status === 'healthy') {
                logger.info('✅ Base de datos saludable:', healthResult);
            } else {
                logger.warn('⚠️ Problemas detectados en la base de datos:', healthResult);
            }

            return healthResult;
        } catch (error) {
            logger.error('❌ Error durante verificaciones de salud:', error);
            throw error;
        }
    }

    /**
     * Desconecta de la base de datos
     */
    async disconnect() {
        try {
            await this.dbConnection.disconnect();
            logger.info('👋 Desconectado de MongoDB Atlas');
        } catch (error) {
            logger.error('❌ Error al desconectar:', error);
        }
    }
}

/**
 * Función principal para ejecutar la conexión y configuración
 */
async function main() {
    const atlasManager = new AtlasConnectionManager();

    try {
        console.log('🌟 Iniciando proceso de conexión a MongoDB Atlas...\n');

        // Paso 1: Verificar conexión
        const connectionSuccess = await atlasManager.testConnection();
        if (!connectionSuccess) {
            throw new Error('No se pudo establecer conexión a MongoDB Atlas');
        }

        // Paso 2: Configurar base de datos
        const setupResults = await atlasManager.setupDatabase();
        console.log('\n📊 Resultados de configuración:');
        console.log(JSON.stringify(setupResults, null, 2));

        // Paso 3: Verificaciones de salud
        const healthResults = await atlasManager.runHealthChecks();
        console.log('\n🏥 Estado de salud de la base de datos:');
        console.log(JSON.stringify(healthResults, null, 2));

        console.log('\n🎉 ¡Conexión a MongoDB Atlas configurada exitosamente!');
        console.log('📝 Puedes ahora ejecutar tu aplicación con: npm start');

    } catch (error) {
        console.error('\n❌ Error durante la configuración:', error.message);
        process.exit(1);
    } finally {
        await atlasManager.disconnect();
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AtlasConnectionManager;
