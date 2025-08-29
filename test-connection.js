/**
 * Script para probar la conexión a MongoDB Atlas
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('🔌 Probando conexión a MongoDB Atlas...');

        // Mostrar la configuración (sin mostrar la contraseña)
        console.log('Configuración:');
        console.log('- Username:', process.env.MONGODB_ATLAS_USERNAME);
        console.log('- Cluster:', process.env.MONGODB_ATLAS_CLUSTER);
        console.log('- Database:', process.env.MONGODB_ATLAS_DATABASE);
        console.log('- USE_ATLAS:', process.env.USE_ATLAS);

        // Construir la cadena de conexión
        const connectionString = process.env.MONGODB_ATLAS_CONNECTION_STRING ||
            `mongodb+srv://${encodeURIComponent(process.env.MONGODB_ATLAS_USERNAME)}:${encodeURIComponent(process.env.MONGODB_ATLAS_PASSWORD)}@${process.env.MONGODB_ATLAS_CLUSTER}/${process.env.MONGODB_ATLAS_DATABASE}?retryWrites=true&w=majority&appName=FSO-Automation-Backend`;

        console.log('- Connection String:', connectionString.replace(/:([^:@]+)@/, ':***@'));

        // Opciones de conexión
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        };

        console.log('\n⏳ Intentando conectar...');

        await mongoose.connect(connectionString, options);

        console.log('✅ ¡Conexión exitosa a MongoDB Atlas!');
        console.log('- Estado de conexión:', mongoose.connection.readyState);
        console.log('- Base de datos:', mongoose.connection.name);
        console.log('- Host:', mongoose.connection.host);

        // Probar una operación simple
        console.log('\n📊 Probando operación de ping...');
        const admin = mongoose.connection.db.admin();
        const pingResult = await admin.ping();
        console.log('- Ping result:', pingResult);

        // Listar colecciones
        console.log('\n📋 Listando colecciones...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('- Colecciones encontradas:', collections.map(c => c.name));

        await mongoose.disconnect();
        console.log('\n✅ Desconectado exitosamente');

    } catch (error) {
        console.error('\n❌ Error de conexión:');
        console.error('- Mensaje:', error.message);
        console.error('- Código:', error.code);
        console.error('- Detalles:', error.codeName);

        if (error.reason) {
            console.error('- Razón:', error.reason);
        }

        process.exit(1);
    }
}

testConnection();
