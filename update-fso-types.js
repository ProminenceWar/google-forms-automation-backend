// Script para actualizar tipos de FSO en formularios existentes
require('dotenv').config();
const mongoose = require('mongoose');
const { FSOForm } = require('./src/models');
const config = require('./src/config');

// Mapeo de tipos antiguos a nuevos
const tiposMigration = {
    'Instalación Fibra': 'instalaciones',
    'Reparación Fibra': 'tickets_averia',
    'Instalación Cobre': 'instalaciones',
    'Reparación Cobre': 'tickets_averia',
    'Inspección': 'inspeccion'
};

async function updateFSOTypes() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(config.database.connectionString, config.database.options);
        console.log('✅ Conectado a MongoDB');

        console.log('\n🔄 Actualizando tipos de FSO...');

        // Buscar todos los formularios con tipos antiguos
        const formularios = await FSOForm.find({
            tipoFSO: { $in: Object.keys(tiposMigration) }
        });

        console.log(`📋 Encontrados ${formularios.length} formularios para actualizar`);

        let actualizados = 0;
        for (const formulario of formularios) {
            const tipoAntiguo = formulario.tipoFSO;
            const tipoNuevo = tiposMigration[tipoAntiguo];

            if (tipoNuevo) {
                await FSOForm.updateOne(
                    { _id: formulario._id },
                    { tipoFSO: tipoNuevo }
                );
                console.log(`✅ ${formulario.numeroOrden}: ${tipoAntiguo} → ${tipoNuevo}`);
                actualizados++;
            }
        }

        console.log(`\n🎉 Actualización completada: ${actualizados} formularios actualizados`);

        // Verificar el estado final
        console.log('\n📊 Estado final de tipos de FSO:');
        const tiposActuales = await FSOForm.aggregate([
            { $group: { _id: '$tipoFSO', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        tiposActuales.forEach(tipo => {
            console.log(`- ${tipo._id}: ${tipo.count} formularios`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

updateFSOTypes();
