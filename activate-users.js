// Script para activar todos los usuarios
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');
const config = require('./src/config');

async function activateAllUsers() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(config.database.connectionString, config.database.options);
        console.log('✅ Conectado a MongoDB');

        console.log('\n🔧 Activando todos los usuarios...');

        const result = await User.updateMany(
            {},
            { active: true }
        );

        console.log(`✅ ${result.modifiedCount} usuarios activados exitosamente`);

        // Verificar el estado final
        console.log('\n📋 Estado final de usuarios:');
        const users = await User.find({}).select('email active role');
        users.forEach(user => {
            console.log(`- ${user.email} (${user.role}): ${user.active ? '✅ Activo' : '❌ Inactivo'}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

activateAllUsers();
