/**
 * MongoDB Playground - Google Forms Automation Backend
 * Configuración inicial de base de datos y colecciones
 * 
 * Instrucciones:
 * 1. Conecta a tu cluster de MongoDB Atlas
 * 2. Selecciona la base de datos: google_forms_automation
 * 3. Ejecuta este script para crear las colecciones e índices
 */

// =================================================================
// CONFIGURACIÓN DE BASE DE DATOS
// =================================================================

// Usar la base de datos del proyecto
use('google_forms_automation');

// =================================================================
// CREAR COLECCIONES Y CONFIGURACIONES
// =================================================================

// 1. Colección de Usuarios
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["email", "password", "name", "role", "company"],
            properties: {
                email: {
                    bsonType: "string",
                    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$",
                    description: "Email válido es requerido"
                },
                password: {
                    bsonType: "string",
                    minLength: 6,
                    description: "Contraseña con mínimo 6 caracteres"
                },
                name: {
                    bsonType: "string",
                    minLength: 2,
                    maxLength: 100,
                    description: "Nombre con 2-100 caracteres"
                },
                role: {
                    bsonType: "string",
                    enum: ["tecnico", "supervisor", "admin"],
                    description: "Rol válido es requerido"
                },
                company: {
                    bsonType: "string",
                    minLength: 2,
                    maxLength: 100,
                    description: "Compañía es requerida"
                },
                active: {
                    bsonType: "bool",
                    description: "Estado activo del usuario"
                }
            }
        }
    }
});

// 2. Colección de Formularios FSO
db.createCollection('fsoforms', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["formId", "email", "numeroOrden", "tipoFSO", "companiaInspeccion", "nombreTecnico"],
            properties: {
                formId: {
                    bsonType: "string",
                    pattern: "^fso_\\d+_[a-zA-Z0-9]+$",
                    description: "ID único del formulario"
                },
                email: {
                    bsonType: "string",
                    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$",
                    description: "Email válido es requerido"
                },
                numeroOrden: {
                    bsonType: "string",
                    minLength: 3,
                    maxLength: 50,
                    description: "Número de orden único"
                },
                tipoFSO: {
                    bsonType: "string",
                    enum: ["Instalación Fibra", "Reparación Fibra", "Instalación Cobre", "Reparación Cobre", "Inspección"],
                    description: "Tipo de FSO válido"
                },
                estado: {
                    bsonType: "string",
                    enum: ["pendiente", "completado", "revisado", "archivado"],
                    description: "Estado del formulario"
                }
            }
        }
    }
});

// 3. Colección de Archivos
db.createCollection('files', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["fileId", "nombre", "nombreArchivo", "extension", "mimeType", "tamaño"],
            properties: {
                fileId: {
                    bsonType: "string",
                    pattern: "^file_\\d+_[a-zA-Z0-9]+$",
                    description: "ID único del archivo"
                },
                nombre: {
                    bsonType: "string",
                    maxLength: 255,
                    description: "Nombre del archivo"
                },
                extension: {
                    bsonType: "string",
                    enum: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
                    description: "Extensión permitida"
                },
                mimeType: {
                    bsonType: "string",
                    description: "Tipo MIME del archivo"
                },
                tamaño: {
                    bsonType: "number",
                    minimum: 0,
                    description: "Tamaño del archivo en bytes"
                }
            }
        }
    }
});

// =================================================================
// CREAR ÍNDICES PARA OPTIMIZACIÓN
// =================================================================

print("Creando índices para colección 'users'...");

// Índices para Users
db.users.createIndex({ email: 1 }, { unique: true, name: "idx_users_email_unique" });
db.users.createIndex({ role: 1 }, { name: "idx_users_role" });
db.users.createIndex({ company: 1 }, { name: "idx_users_company" });
db.users.createIndex({ active: 1 }, { name: "idx_users_active" });
db.users.createIndex({ createdAt: -1 }, { name: "idx_users_created_desc" });
db.users.createIndex({ lastLogin: -1 }, { name: "idx_users_lastlogin_desc" });
db.users.createIndex({
    role: 1,
    active: 1,
    createdAt: -1
}, { name: "idx_users_role_active_created" });

print("Creando índices para colección 'fsoforms'...");

// Índices para FSOForms
db.fsoforms.createIndex({ formId: 1 }, { unique: true, name: "idx_fsoforms_formid_unique" });
db.fsoforms.createIndex({ numeroOrden: 1 }, { unique: true, name: "idx_fsoforms_numero_orden_unique" });
db.fsoforms.createIndex({ email: 1 }, { name: "idx_fsoforms_email" });
db.fsoforms.createIndex({ estado: 1 }, { name: "idx_fsoforms_estado" });
db.fsoforms.createIndex({ tipoFSO: 1 }, { name: "idx_fsoforms_tipo" });
db.fsoforms.createIndex({ companiaInspeccion: 1 }, { name: "idx_fsoforms_compania" });
db.fsoforms.createIndex({ nombreTecnico: 1 }, { name: "idx_fsoforms_tecnico" });
db.fsoforms.createIndex({ createdAt: -1 }, { name: "idx_fsoforms_created_desc" });
db.fsoforms.createIndex({ updatedAt: -1 }, { name: "idx_fsoforms_updated_desc" });
db.fsoforms.createIndex({ "cliente.nombreCliente": 1 }, { name: "idx_fsoforms_cliente_nombre" });
db.fsoforms.createIndex({ "puntuaciones.puntuacionCalculada": -1 }, { name: "idx_fsoforms_puntuacion_desc" });

// Índice compuesto para búsquedas complejas
db.fsoforms.createIndex({
    estado: 1,
    companiaInspeccion: 1,
    createdAt: -1
}, { name: "idx_fsoforms_estado_compania_created" });

// Índice de texto para búsquedas
db.fsoforms.createIndex({
    numeroOrden: "text",
    "cliente.nombreCliente": "text",
    comentariosCaso: "text"
}, { name: "idx_fsoforms_text_search" });

print("Creando índices para colección 'files'...");

// Índices para Files
db.files.createIndex({ fileId: 1 }, { unique: true, name: "idx_files_fileid_unique" });
db.files.createIndex({ nombreArchivo: 1 }, { unique: true, name: "idx_files_nombre_archivo_unique" });
db.files.createIndex({ hash: 1 }, { unique: true, name: "idx_files_hash_unique" });
db.files.createIndex({ "relaciones.formularioFSO": 1 }, { name: "idx_files_formulario_fso" });
db.files.createIndex({ "relaciones.usuario": 1 }, { name: "idx_files_usuario" });
db.files.createIndex({ "sistema.subidoPor": 1 }, { name: "idx_files_subido_por" });
db.files.createIndex({ mimeType: 1 }, { name: "idx_files_mime_type" });
db.files.createIndex({ "metadatos.categoria": 1 }, { name: "idx_files_categoria" });
db.files.createIndex({ createdAt: -1 }, { name: "idx_files_created_desc" });
db.files.createIndex({ "procesamiento.estado": 1 }, { name: "idx_files_procesamiento_estado" });
db.files.createIndex({ "retencion.eliminado": 1 }, { name: "idx_files_eliminado" });

// Índice compuesto para búsquedas de archivos
db.files.createIndex({
    "metadatos.categoria": 1,
    "procesamiento.estado": 1,
    createdAt: -1
}, { name: "idx_files_categoria_estado_created" });

// =================================================================
// INSERTAR DATOS DE PRUEBA
// =================================================================

print("Insertando datos de prueba...");

// Usuario administrador por defecto
db.users.insertOne({
    email: "admin@fso-automation.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewRdkd0U8I2NzqPq", // password: admin123
    name: "Administrador Sistema",
    role: "admin",
    company: "FSO Automation Corp",
    active: true,
    lastLogin: null,
    loginAttempts: 0,
    lockUntil: null,
    refreshTokens: [],
    profile: {
        phone: "+52 555 123 4567",
        avatar: null,
        timezone: "America/Mexico_City",
        language: "es"
    },
    preferences: {
        emailNotifications: true,
        pushNotifications: true,
        theme: "light"
    },
    metadata: {
        createdBy: null,
        createdFrom: {
            ip: "127.0.0.1",
            userAgent: "System Setup"
        }
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

// Usuario técnico de prueba
db.users.insertOne({
    email: "tecnico@techinstall.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewRdkd0U8I2NzqPq", // password: admin123
    name: "Carlos López",
    role: "tecnico",
    company: "TechInstall Corp",
    active: true,
    lastLogin: null,
    loginAttempts: 0,
    lockUntil: null,
    refreshTokens: [],
    profile: {
        phone: "+52 555 987 6543",
        avatar: null,
        timezone: "America/Mexico_City",
        language: "es"
    },
    preferences: {
        emailNotifications: true,
        pushNotifications: true,
        theme: "light"
    },
    metadata: {
        createdBy: null,
        createdFrom: {
            ip: "192.168.1.100",
            userAgent: "Chrome/91.0.4472.124"
        }
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

// Usuario supervisor de prueba
db.users.insertOne({
    email: "supervisor@techinstall.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewRdkd0U8I2NzqPq", // password: admin123
    name: "María González",
    role: "supervisor",
    company: "TechInstall Corp",
    active: true,
    lastLogin: null,
    loginAttempts: 0,
    lockUntil: null,
    refreshTokens: [],
    profile: {
        phone: "+52 555 456 7890",
        avatar: null,
        timezone: "America/Mexico_City",
        language: "es"
    },
    preferences: {
        emailNotifications: true,
        pushNotifications: true,
        theme: "dark"
    },
    metadata: {
        createdBy: null,
        createdFrom: {
            ip: "192.168.1.101",
            userAgent: "Firefox/89.0"
        }
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

// Formulario FSO de ejemplo
db.fsoforms.insertOne({
    formId: "fso_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    email: "tecnico@techinstall.com",
    numeroOrden: "ORD-2025-001",
    tipoFSO: "Instalación Fibra",
    companiaInspeccion: "TechInstall Corp",
    nombreTecnico: "Carlos López",

    inspeccionTecnica: {
        instalacionDireccionCorrecta: true,
        combaFTB: true,
        colocacionGripCorrecta: false,
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
        metrosDrop: "25",
        potenciaCorrecta: "-15 dBm"
    },

    cliente: {
        nombreCliente: "Juan Pérez",
        telefonoCliente: "+52 555 123 4567",
        puntuacionCliente: "9"
    },

    comentariosCaso: "Instalación completada sin inconvenientes. Cliente satisfecho con el servicio.",

    ubicacion: {
        latitude: 19.4326,
        longitude: -99.1332,
        direccion: "Av. Reforma 123, Col. Centro, CDMX",
        precision: 10
    },

    estado: "completado",

    puntuaciones: {
        puntuacionCalculada: 8.5,
        criteriosAprobados: 10,
        totalCriterios: 11,
        porcentajeAprobacion: 91
    },

    archivosAdjuntos: [],

    historial: [{
        accion: "creado",
        fecha: new Date(),
        usuario: "Carlos López",
        usuarioId: null,
        cambios: [],
        comentario: "Formulario creado inicialmente"
    }],

    procesamiento: {
        fechaProcesamiento: new Date(),
        tiempoProcesamiento: 1500,
        reportePdfGenerado: false,
        reportePdfUrl: null,
        notificacionEnviada: false,
        validacionAutomatica: {
            realizada: true,
            resultado: "aprobado",
            errores: []
        }
    },

    metadata: {
        creadoPor: null,
        actualizadoPor: null,
        ipOrigen: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        version: 1
    },

    createdAt: new Date(),
    updatedAt: new Date()
});

// =================================================================
// VERIFICACIÓN DE CONFIGURACIÓN
// =================================================================

print("\n=================================================================");
print("RESUMEN DE CONFIGURACIÓN COMPLETADA");
print("=================================================================");

print("\n📊 Colecciones creadas:");
print("✅ users - Gestión de usuarios del sistema");
print("✅ fsoforms - Formularios FSO");
print("✅ files - Gestión de archivos");

print("\n📈 Índices creados:");
print("✅ users: " + db.users.getIndexes().length + " índices");
print("✅ fsoforms: " + db.fsoforms.getIndexes().length + " índices");
print("✅ files: " + db.files.getIndexes().length + " índices");

print("\n👥 Usuarios de prueba creados:");
print("✅ admin@fso-automation.com (admin) - password: admin123");
print("✅ tecnico@techinstall.com (tecnico) - password: admin123");
print("✅ supervisor@techinstall.com (supervisor) - password: admin123");

print("\n📋 Datos de prueba:");
print("✅ " + db.fsoforms.countDocuments() + " formulario(s) FSO de ejemplo");

print("\n🎯 Próximos pasos:");
print("1. Configurar variables de entorno con la cadena de conexión");
print("2. Implementar controladores y servicios");
print("3. Configurar autenticación JWT");
print("4. Realizar pruebas de conexión");

print("\n=================================================================");
print("✅ CONFIGURACIÓN DE BASE DE DATOS COMPLETADA");
print("=================================================================");

// =================================================================
// CONSULTAS DE VERIFICACIÓN
// =================================================================

print("\n🔍 Verificando configuración...");

// Verificar usuarios
print("\nUsuarios en el sistema:");
db.users.find({}, { email: 1, name: 1, role: 1, company: 1, active: 1 }).forEach(function (user) {
    print(`- ${user.email} (${user.role}) - ${user.company} - ${user.active ? 'Activo' : 'Inactivo'}`);
});

// Verificar formularios
print("\nFormularios FSO:");
db.fsoforms.find({}, { numeroOrden: 1, tipoFSO: 1, estado: 1, nombreTecnico: 1 }).forEach(function (form) {
    print(`- ${form.numeroOrden} - ${form.tipoFSO} - ${form.estado} - ${form.nombreTecnico}`);
});

// Estadísticas de índices
print("\nEstadísticas de índices:");
print("Users:", JSON.stringify(db.users.stats().indexSizes, null, 2));
print("FSO Forms:", JSON.stringify(db.fsoforms.stats().indexSizes, null, 2));
print("Files:", JSON.stringify(db.files.stats().indexSizes, null, 2));
