// Script para verificar y actualizar el estado de usuarios
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');
const config = require('./src/config');

async function checkAndFixUsers() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(config.database.connectionString, config.database.options);
        console.log('✅ Conectado a MongoDB');

        console.log('\n📋 Verificando usuarios...');

        // Buscar todos los usuarios
        const users = await User.find({}).select('email isActive role');

        console.log('\n👥 Usuarios encontrados:');
        users.forEach(user => {
            console.log(`- ${user.email} (${user.role}): ${user.isActive ? '✅ Activo' : '❌ Inactivo'}`);
        });

        // Activar al usuario admin
        console.log('\n🔧 Activando usuario admin...');
        const adminUser = await User.findOneAndUpdate(
            { email: 'admin@fso-automation.com' },
            { isActive: true },
            { new: true }
        ).select('email isActive role');

        if (adminUser) {
            console.log(`✅ Usuario ${adminUser.email} activado exitosamente`);
        } else {
            console.log('❌ Usuario admin no encontrado');
        }

        // Verificar todos los usuarios después de la actualización
        console.log('\n📋 Estado final de usuarios:');
        const updatedUsers = await User.find({}).select('email isActive role');
        updatedUsers.forEach(user => {
            console.log(`- ${user.email} (${user.role}): ${user.isActive ? '✅ Activo' : '❌ Inactivo'}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

checkAndFixUsers();
