/**
 * @fileoverview Script para verificar usuarios en la base de datos
 * @description Te ayuda a ver qué usuarios existen y sus credenciales
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
async function connectDB() {
    try {
        const connectionString = process.env.MONGODB_ATLAS_CONNECTION_STRING ||
            'mongodb+srv://luzpagarnito:Diciembre2024@cluster0.yancr5f.mongodb.net/google-forms-automation?retryWrites=true&w=majority';

        await mongoose.connect(connectionString);
        console.log('✅ Conectado a MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        return false;
    }
}

// Definir el modelo de usuario (simplificado)
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    role: String,
    company: String,
    active: { type: Boolean, default: true },
    refreshTokens: [{
        token: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date
    }]
});

const User = mongoose.model('User', userSchema);

/**
 * 🔍 Función para listar todos los usuarios
 */
async function listUsers() {
    try {
        console.log('\n👥 USUARIOS EN LA BASE DE DATOS:');
        console.log('='.repeat(60));

        const users = await User.find({}, {
            email: 1,
            name: 1,
            role: 1,
            company: 1,
            active: 1,
            refreshTokens: 1
        });

        if (users.length === 0) {
            console.log('📭 No hay usuarios en la base de datos');
            console.log('\n💡 Sugerencias:');
            console.log('1. Ejecutar script de inserción de datos: npm run insert-sample-data');
            console.log('2. Crear usuario manualmente');
            return;
        }

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. 👤 ${user.name || 'Sin nombre'}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🎭 Rol: ${user.role}`);
            console.log(`   🏢 Empresa: ${user.company || 'N/A'}`);
            console.log(`   🟢 Activo: ${user.active ? 'Sí' : 'No'}`);
            console.log(`   🔑 Tokens activos: ${user.refreshTokens?.length || 0}`);
        });

        console.log('\n💡 Para probar con estos usuarios, necesitas saber sus passwords.');
        console.log('💡 Normalmente las passwords están hasheadas y no se pueden ver.');

        return users;

    } catch (error) {
        console.error('❌ Error listando usuarios:', error.message);
        return [];
    }
}

/**
 * 🔧 Función para crear un usuario de prueba
 */
async function createTestUser() {
    try {
        const bcrypt = require('bcryptjs');

        console.log('\n🔧 CREANDO USUARIO DE PRUEBA...');

        // Verificar si ya existe
        const existingUser = await User.findOne({ email: 'admin@fso-automation.com' });
        if (existingUser) {
            console.log('👤 Usuario ya existe: admin@fso-automation.com');
            return existingUser;
        }

        // Crear password hasheada
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Crear usuario
        const newUser = new User({
            email: 'admin@fso-automation.com',
            password: hashedPassword,
            name: 'Administrador Prueba',
            role: 'admin',
            company: 'FSO Automation',
            active: true
        });

        await newUser.save();
        console.log('✅ Usuario de prueba creado exitosamente');
        console.log('📧 Email: admin@fso-automation.com');
        console.log('🔑 Password: admin123');
        console.log('🎭 Rol: admin');

        return newUser;

    } catch (error) {
        console.error('❌ Error creando usuario de prueba:', error.message);
        return null;
    }
}

/**
 * 🚀 Función principal
 */
async function main() {
    console.log('🔍 VERIFICADOR DE USUARIOS - Base de Datos');
    console.log('🎯 Te ayuda a ver qué usuarios puedes usar para pruebas\n');

    // Conectar a la base de datos
    const connected = await connectDB();
    if (!connected) {
        console.log('❌ No se pudo conectar a la base de datos');
        return;
    }

    try {
        // Listar usuarios existentes
        const users = await listUsers();

        // Si no hay usuarios o no está el de prueba, crearlo
        const testUserExists = users.some(user => user.email === 'admin@fso-automation.com');

        if (!testUserExists) {
            console.log('\n🔧 No se encontró usuario de prueba. ¿Quieres crearlo? (Sí/No)');
            console.log('💡 Esto creará el usuario: admin@fso-automation.com con password: admin123');

            // En un script real, usarías readline para input del usuario
            // Por simplicidad, lo creamos automáticamente
            await createTestUser();
        }

        console.log('\n✨ RESUMEN:');
        console.log('📋 Ahora puedes usar estos usuarios para pruebas');
        console.log('🧪 Ejecuta: node test-refresh-tokens-educativo.js');

    } catch (error) {
        console.error('❌ Error en la verificación:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().then(() => {
        console.log('\n✅ Verificación completada');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
}

module.exports = { listUsers, createTestUser };
