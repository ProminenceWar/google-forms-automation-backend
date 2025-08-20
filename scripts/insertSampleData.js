/**
 * @fileoverview Script para insertar datos de muestra en MongoDB Atlas
 * @description Inserta usuarios, formularios FSO y archivos de prueba en la base de datos
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { User, FSOForm, File } = require('../src/models');
const { FSO_TYPES, FSO_STATES, USER_ROLES, FILE_TYPES } = require('../src/constants');
const logger = require('../src/utils/logger');

// Datos de usuarios de muestra
const sampleUsers = [
    {
        email: 'admin@tecnetwork.com',
        password: 'admin123',
        name: 'Administrador del Sistema',
        role: USER_ROLES.ADMIN,
        company: 'TecNetwork Solutions',
        profile: {
            phone: '+52 55 1234 5678',
            timezone: 'America/Mexico_City',
            language: 'es'
        }
    },
    {
        email: 'tech001@tecnetwork.com',
        password: 'tech123',
        name: 'Juan Pérez Martínez',
        role: USER_ROLES.TECHNICIAN,
        company: 'TecNetwork Solutions',
        profile: {
            phone: '+52 33 9876 5432',
            timezone: 'America/Mexico_City',
            language: 'es'
        }
    },
    {
        email: 'tech002@tecnetwork.com',
        password: 'tech123',
        name: 'Ana García López',
        role: USER_ROLES.TECHNICIAN,
        company: 'TecNetwork Solutions',
        profile: {
            phone: '+52 81 5555 1234',
            timezone: 'America/Mexico_City',
            language: 'es'
        }
    },
    {
        email: 'supervisor@tecnetwork.com',
        password: 'super123',
        name: 'Carlos Rodríguez Sánchez',
        role: USER_ROLES.SUPERVISOR,
        company: 'TecNetwork Solutions',
        profile: {
            phone: '+52 55 8888 9999',
            timezone: 'America/Mexico_City',
            language: 'es'
        }
    }
];

// Datos de formularios FSO de muestra
const sampleFSOForms = [
    {
        email: 'contacto@empresaabc.com',
        numeroOrden: 'ORD-2025-001-tetikl',
        tipoFSO: FSO_TYPES.FIBER_INSTALLATION,
        companiaInspeccion: 'TecNetwork Solutions',
        nombreTecnico: 'Juan Pérez Martínez',
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
            metrosDrop: '25.5',
            potenciaCorrecta: '-12.5 dBm'
        },
        cliente: {
            nombreCliente: 'Empresa ABC S.A.',
            telefonoCliente: '+1234567890',
            puntuacionCliente: '9'
        },
        datosCliente: {
            nombre: 'Empresa ABC S.A.',
            direccion: 'Av. Principal 123, Ciudad',
            telefono: '+1234567890',
            email: 'contacto@empresaabc.com'
        },
        datosInstalacion: {
            tipoServicio: 'Fibra Óptica Empresarial',
            velocidadContratada: '1000',
            equipoInstalado: ['ONT-1000', 'Router-Pro', 'Cable-50m'],
            fechaProgramada: new Date('2025-08-20T09:00:00.000Z'),
            fechaCompletado: new Date('2025-08-19T16:30:00.000Z')
        },
        observaciones: {
            tecnico: 'Instalación completada sin inconvenientes. Cliente satisfecho con el servicio.',
            cliente: 'Excelente servicio, muy profesional el técnico.'
        },
        comentariosCaso: 'Instalación completada exitosamente sin incidentes.',
        ubicacion: {
            latitude: 19.4326,
            longitude: -99.1332,
            direccion: 'Av. Principal 123, Ciudad',
            precision: 10
        },
        estado: FSO_STATES.COMPLETED,
        prioridad: 'alta',
        fechaCreacion: new Date('2025-08-18T10:00:00.000Z'),
        fechaActualizacion: new Date('2025-08-19T16:30:00.000Z')
    },
    {
        email: 'admin@torresnorte.com',
        numeroOrden: 'ORD-2025-002',
        tipoFSO: FSO_TYPES.INSPECTION,
        companiaInspeccion: 'TecNetwork Solutions',
        nombreTecnico: 'Ana García López',
        inspeccionTecnica: {
            instalacionDireccionCorrecta: true,
            combaFTB: true,
            colocacionGripCorrecta: true,
            alturaDropCorrecta: true,
            puntoApoyoAdecuado: true,
            dropLibreEmpalme: true,
            colocacionGanchosCorrecta: false,
            recorridoDropExteriorAdecuado: true,
            colocacionTestTerminalCorrecta: true,
            jackSuperficieCorrecto: true,
            routerUbicadoCorrectamente: true
        },
        medicionesTecnicas: {
            metrosDrop: '18.0',
            potenciaCorrecta: '-10.2 dBm'
        },
        cliente: {
            nombreCliente: 'Condominio Torres del Norte',
            telefonoCliente: '+1234567891',
            puntuacionCliente: '8'
        },
        datosCliente: {
            nombre: 'Condominio Torres del Norte',
            direccion: 'Calle Norte 456, Ciudad',
            telefono: '+1234567891',
            email: 'admin@torresnorte.com'
        },
        datosInstalacion: {
            tipoServicio: 'Mantenimiento Preventivo',
            velocidadContratada: '500',
            equipoInstalado: ['Switch-24p', 'Patch-Panel', 'Cable-Tester'],
            fechaProgramada: new Date('2025-08-21T14:00:00.000Z'),
            fechaCompletado: null
        },
        observaciones: {
            tecnico: 'Pendiente de programación. Se detectó un gancho mal colocado que requiere atención.',
            cliente: null
        },
        comentariosCaso: 'Se requiere reemplazar gancho de soporte en poste número 3.',
        ubicacion: {
            latitude: 19.5326,
            longitude: -99.0332,
            direccion: 'Calle Norte 456, Ciudad',
            precision: 8
        },
        estado: FSO_STATES.PENDING,
        prioridad: 'media',
        fechaCreacion: new Date('2025-08-19T08:00:00.000Z'),
        fechaActualizacion: new Date('2025-08-19T08:00:00.000Z')
    },
    {
        email: 'soporte@residencialverde.com',
        numeroOrden: 'ORD-2025-003',
        tipoFSO: FSO_TYPES.FIBER_REPAIR,
        companiaInspeccion: 'TecNetwork Solutions',
        nombreTecnico: 'Juan Pérez Martínez',
        inspeccionTecnica: {
            instalacionDireccionCorrecta: true,
            combaFTB: false,
            colocacionGripCorrecta: true,
            alturaDropCorrecta: true,
            puntoApoyoAdecuado: true,
            dropLibreEmpalme: false,
            colocacionGanchosCorrecta: true,
            recorridoDropExteriorAdecuado: true,
            colocacionTestTerminalCorrecta: true,
            jackSuperficieCorrecto: true,
            routerUbicadoCorrectamente: true
        },
        medicionesTecnicas: {
            metrosDrop: '32.8',
            potenciaCorrecta: '-15.1 dBm'
        },
        cliente: {
            nombreCliente: 'Residencial Verde',
            telefonoCliente: '+1234567892',
            puntuacionCliente: '6'
        },
        datosCliente: {
            nombre: 'Residencial Verde',
            direccion: 'Av. Verde 789, Fraccionamiento',
            telefono: '+1234567892',
            email: 'soporte@residencialverde.com'
        },
        datosInstalacion: {
            tipoServicio: 'Reparación de Fibra Óptica',
            velocidadContratada: '200',
            equipoInstalado: ['ONT-200', 'Router-Basic'],
            fechaProgramada: new Date('2025-08-22T10:00:00.000Z'),
            fechaCompletado: null
        },
        observaciones: {
            tecnico: 'En progreso. Se detectaron problemas en el cableado que requieren reemplazo.',
            cliente: 'Urgente, llevamos 2 días sin servicio.'
        },
        comentariosCaso: 'Cable de fibra óptica dañado por construcción vecina. Requiere reemplazo completo.',
        ubicacion: {
            latitude: 19.3326,
            longitude: -99.2332,
            direccion: 'Av. Verde 789, Fraccionamiento',
            precision: 12
        },
        estado: FSO_STATES.PENDING,
        prioridad: 'alta',
        fechaCreacion: new Date('2025-08-19T14:00:00.000Z'),
        fechaActualizacion: new Date('2025-08-19T15:30:00.000Z')
    }
];

// Datos de archivos de muestra (se crearán después de tener los formularios)
const sampleFiles = [
    {
        nombre: 'Formulario_FSO_001.pdf',
        nombreArchivo: 'fso_001_formulario_20250819.pdf',
        extension: 'pdf',
        mimeType: FILE_TYPES.PDF,
        tamaño: 2048576,
        hash: 'hash_formulario_001',
        storage: {
            tipo: 'local',
            ruta: '/storage/forms/fso_001_formulario_20250819.pdf',
            url: '/api/files/fso_001_formulario_20250819.pdf'
        },
        procesamiento: {
            estado: 'completado',
            fechaCompletado: new Date('2025-08-19T16:30:00.000Z'),
            pdf: {
                paginas: 3,
                titulo: 'Formulario FSO - Orden 001',
                textoExtraido: 'Formulario de instalación de fibra óptica...'
            }
        },
        metadatos: {
            descripcion: 'Formulario FSO completado para orden 001',
            categoria: 'formulario',
            origen: 'generado'
        }
    },
    {
        nombre: 'Imagen_Instalacion_001.jpg',
        nombreArchivo: 'instalacion_001_evidencia_20250819.jpg',
        extension: 'jpg',
        mimeType: FILE_TYPES.IMAGE_JPEG,
        tamaño: 1024000,
        hash: 'hash_imagen_001',
        storage: {
            tipo: 'local',
            ruta: '/storage/images/instalacion_001_evidencia_20250819.jpg',
            url: '/api/files/instalacion_001_evidencia_20250819.jpg'
        },
        procesamiento: {
            estado: 'completado',
            fechaCompletado: new Date('2025-08-19T16:30:00.000Z'),
            imagen: {
                ancho: 1920,
                alto: 1080,
                formato: 'JPEG',
                thumbnailGenerado: true
            }
        },
        metadatos: {
            descripcion: 'Evidencia fotográfica de instalación completada',
            categoria: 'evidencia',
            origen: 'upload'
        }
    }
];

/**
 * Conecta a MongoDB Atlas
 */
async function connectToDatabase() {
    try {
        await mongoose.connect(config.database.connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('✅ Conectado a MongoDB Atlas exitosamente');
    } catch (error) {
        logger.error('❌ Error conectando a MongoDB Atlas:', error);
        throw error;
    }
}

/**
 * Limpia la base de datos (solo para desarrollo)
 */
async function clearDatabase() {
    try {
        await User.deleteMany({});
        await FSOForm.deleteMany({});
        await File.deleteMany({});
        logger.info('🧹 Base de datos limpiada');
    } catch (error) {
        logger.error('❌ Error limpiando base de datos:', error);
        throw error;
    }
}

/**
 * Inserta usuarios de muestra
 */
async function insertUsers() {
    try {
        const users = [];

        for (const userData of sampleUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            users.push({
                ...userData,
                password: hashedPassword
            });
        }

        const insertedUsers = await User.insertMany(users);
        logger.info(`✅ ${insertedUsers.length} usuarios insertados`);
        return insertedUsers;
    } catch (error) {
        logger.error('❌ Error insertando usuarios:', error);
        throw error;
    }
}

/**
 * Inserta formularios FSO de muestra
 */
async function insertFSOForms(users) {
    try {
        const forms = sampleFSOForms.map((formData, index) => {
            const techUser = users.find(u => u.role === USER_ROLES.TECHNICIAN);
            return {
                ...formData,
                creadoPor: techUser ? techUser._id : users[0]._id,
                actualizadoPor: techUser ? techUser._id : users[0]._id
            };
        });

        const insertedForms = await FSOForm.insertMany(forms);
        logger.info(`✅ ${insertedForms.length} formularios FSO insertados`);
        return insertedForms;
    } catch (error) {
        logger.error('❌ Error insertando formularios FSO:', error);
        throw error;
    }
}

/**
 * Inserta archivos de muestra
 */
async function insertFiles(users, forms) {
    try {
        // Por ahora, saltear la inserción de archivos
        // Los archivos se pueden agregar más tarde a través de la API
        logger.info('✅ 0 archivos insertados (se pueden agregar a través de la API)');
        return [];
    } catch (error) {
        logger.error('❌ Error insertando archivos:', error);
        throw error;
    }
}/**
 * Función principal
 */
async function main() {
    try {
        logger.info('🚀 Iniciando inserción de datos de muestra...');

        // Conectar a la base de datos
        await connectToDatabase();

        // Limpiar datos existentes (opcional)
        const shouldClear = process.argv.includes('--clear');
        if (shouldClear) {
            await clearDatabase();
        }

        // Insertar datos
        const users = await insertUsers();
        const forms = await insertFSOForms(users);
        const files = await insertFiles(users, forms);

        logger.info('🎉 Datos de muestra insertados exitosamente:');
        logger.info(`   - Usuarios: ${users.length}`);
        logger.info(`   - Formularios FSO: ${forms.length}`);
        logger.info(`   - Archivos: ${files.length}`);

        // Mostrar información de acceso
        logger.info('\n📋 Usuarios creados:');
        users.forEach(user => {
            logger.info(`   - ${user.email} (${user.role})`);
        });

    } catch (error) {
        logger.error('❌ Error en la inserción de datos:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        logger.info('🔐 Conexión a base de datos cerrada');
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = {
    insertUsers,
    insertFSOForms,
    insertFiles,
    connectToDatabase,
    clearDatabase
};
