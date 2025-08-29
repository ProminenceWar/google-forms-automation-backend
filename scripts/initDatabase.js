/**
 * @fileoverview Script de inicialización de base de datos
 * @description Configuración automática de MongoDB para el proyecto
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const logger = require('../src/utils/logger');

// Importar modelos
const { User, FSOForm } = require('../src/models');

/**
 * Configuración inicial de la base de datos
 */
class DatabaseInitializer {
    constructor() {
        this.users = [];
        this.forms = [];
    }

    /**
     * Ejecuta la inicialización completa
     */
    async initialize() {
        try {
            logger.info('🚀 Iniciando configuración de base de datos...');

            // Conectar a la base de datos
            await this.connect();

            // Crear datos iniciales
            await this.createInitialData();

            // Verificar configuración
            await this.verifySetup();

            logger.info('✅ Configuración de base de datos completada exitosamente');

        } catch (error) {
            logger.error('❌ Error durante la inicialización:', error);
            throw error;
        }
    }

    /**
     * Conecta a MongoDB
     */
    async connect() {
        try {
            await mongoose.connect(config.database.connectionString, {
                ...config.database.options,
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            logger.info('📊 Conectado a MongoDB exitosamente');
        } catch (error) {
            logger.error('❌ Error conectando a MongoDB:', error);
            throw error;
        }
    }

    /**
     * Crea los datos iniciales del sistema
     */
    async createInitialData() {
        try {
            // Limpiar datos existentes si es desarrollo
            if (config.server.nodeEnv === 'development') {
                await this.cleanDatabase();
            }

            // Crear usuarios por defecto
            await this.createDefaultUsers();

            // Crear formulario de ejemplo
            await this.createSampleForm();

            logger.info('✅ Datos iniciales creados exitosamente');
        } catch (error) {
            logger.error('❌ Error creando datos iniciales:', error);
            throw error;
        }
    }

    /**
     * Limpia la base de datos (solo en desarrollo)
     */
    async cleanDatabase() {
        if (config.server.nodeEnv !== 'development') {
            logger.warn('⚠️ Limpieza de base de datos solo permitida en desarrollo');
            return;
        }

        logger.info('🧹 Limpiando base de datos...');

        await User.deleteMany({});
        await FSOForm.deleteMany({});

        logger.info('✅ Base de datos limpiada');
    }

    /**
     * Crea usuarios por defecto del sistema
     */
    async createDefaultUsers() {
        logger.info('👥 Creando usuarios por defecto...');

        const defaultUsers = [
            {
                email: 'admin@fso-automation.com',
                password: 'admin123',
                name: 'Administrador Sistema',
                role: 'admin',
                company: 'FSO Automation Corp',
                profile: {
                    phone: '+52 555 123 4567',
                    timezone: 'America/Mexico_City',
                    language: 'es'
                }
            },
            {
                email: 'supervisor@techinstall.com',
                password: 'supervisor123',
                name: 'María González',
                role: 'supervisor',
                company: 'TechInstall Corp',
                profile: {
                    phone: '+52 555 456 7890',
                    timezone: 'America/Mexico_City',
                    language: 'es'
                }
            },
            {
                email: 'tecnico@techinstall.com',
                password: 'tecnico123',
                name: 'Carlos López',
                role: 'tecnico',
                company: 'TechInstall Corp',
                profile: {
                    phone: '+52 555 987 6543',
                    timezone: 'America/Mexico_City',
                    language: 'es'
                }
            }
        ];

        for (const userData of defaultUsers) {
            try {
                // Verificar si el usuario ya existe
                const existingUser = await User.findOne({ email: userData.email });

                if (!existingUser) {
                    const user = new User({
                        ...userData,
                        active: true,
                        metadata: {
                            createdFrom: {
                                ip: '127.0.0.1',
                                userAgent: 'Database Initializer'
                            }
                        }
                    });

                    await user.save();
                    this.users.push(user);

                    logger.info(`✅ Usuario creado: ${userData.email} (${userData.role})`);
                } else {
                    this.users.push(existingUser);
                    logger.info(`ℹ️ Usuario ya existe: ${userData.email}`);
                }
            } catch (error) {
                logger.error(`❌ Error creando usuario ${userData.email}:`, error);
            }
        }
    }

    /**
     * Crea formulario FSO de ejemplo
     */
    async createSampleForm() {
        logger.info('📋 Creando formulario de ejemplo...');

        try {
            // Buscar técnico para asignar el formulario
            const tecnico = this.users.find(user => user.role === 'tecnico');

            if (!tecnico) {
                logger.warn('⚠️ No se encontró técnico para crear formulario de ejemplo');
                return;
            }

            const sampleForm = new FSOForm({
                email: tecnico.email,
                numeroOrden: 'ORD-2025-' + String(Date.now()).slice(-6),
                tipoFSO: 'instalaciones',
                companiaInspeccion: tecnico.company,
                nombreTecnico: tecnico.name,

                inspeccionTecnica: {
                    instalacionDireccionCorrecta: true,
                    combaFTB: true,
                    colocacionGripCorrecta: true,
                    alturaDropCorrecta: true,
                    puntoApoyoAdecuado: true,
                    dropLibreEmpalme: true,
                    colocacionGanchosCorrecta: true,
                    recorridoDropExteriorAdecuado: true,
                    colocacionTestTerminalCorrecta: true,
                    jackSuperficieCorrecto: true,
                    routerUbicadoCorrectamente: true
                },

                medicionesTecnicas: {
                    metrosDrop: '25',
                    potenciaCorrecta: '-15 dBm'
                },

                cliente: {
                    nombreCliente: 'Juan Pérez Ejemplo',
                    telefonoCliente: '+52 555 123 4567',
                    puntuacionCliente: '9'
                },

                comentariosCaso: 'Instalación de ejemplo completada exitosamente. Todas las verificaciones técnicas pasaron correctamente.',

                ubicacion: {
                    latitude: 19.4326,
                    longitude: -99.1332,
                    direccion: 'Av. Reforma 123, Col. Centro, CDMX, México',
                    precision: 10
                },

                estado: 'completado',

                metadata: {
                    creadoPor: tecnico._id,
                    ipOrigen: '127.0.0.1',
                    userAgent: 'Database Initializer',
                    version: 1
                }
            });

            // Agregar entrada al historial
            sampleForm.agregarHistorial(
                'creado',
                tecnico.name,
                tecnico._id,
                [],
                'Formulario de ejemplo creado durante inicialización'
            );

            await sampleForm.save();
            this.forms.push(sampleForm);

            logger.info(`✅ Formulario de ejemplo creado: ${sampleForm.numeroOrden}`);

        } catch (error) {
            logger.error('❌ Error creando formulario de ejemplo:', error);
        }
    }

    /**
     * Verifica que la configuración sea correcta
     */
    async verifySetup() {
        logger.info('🔍 Verificando configuración...');

        try {
            // Verificar usuarios
            const userCount = await User.countDocuments();
            const activeUsers = await User.countDocuments({ active: true });

            logger.info(`👥 Usuarios: ${userCount} total, ${activeUsers} activos`);

            // Verificar formularios
            const formCount = await FSOForm.countDocuments();
            const completedForms = await FSOForm.countDocuments({ estado: 'completado' });

            logger.info(`📋 Formularios: ${formCount} total, ${completedForms} completados`);

            // Verificar índices
            const userIndexes = await User.collection.indexes();
            const formIndexes = await FSOForm.collection.indexes();

            logger.info(`📈 Índices: Users(${userIndexes.length}), Forms(${formIndexes.length})`);

            // Verificar conexión
            const dbState = mongoose.connection.readyState;
            logger.info(`🔌 Estado de conexión: ${this.getConnectionState(dbState)}`);

            logger.info('✅ Verificación completada exitosamente');

        } catch (error) {
            logger.error('❌ Error durante verificación:', error);
            throw error;
        }
    }

    /**
     * Obtiene el estado de conexión legible
     */
    getConnectionState(state) {
        const states = {
            0: 'Desconectado',
            1: 'Conectado',
            2: 'Conectando',
            3: 'Desconectando'
        };
        return states[state] || 'Desconocido';
    }

    /**
     * Desconecta de la base de datos
     */
    async disconnect() {
        try {
            await mongoose.disconnect();
            logger.info('📊 Desconectado de MongoDB');
        } catch (error) {
            logger.error('❌ Error desconectando de MongoDB:', error);
        }
    }
}

// Ejecutar inicialización si se llama directamente
if (require.main === module) {
    const initializer = new DatabaseInitializer();

    initializer.initialize()
        .then(() => {
            logger.info('🎉 Inicialización completada exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Error durante inicialización:', error);
            process.exit(1);
        });
}

module.exports = DatabaseInitializer;
