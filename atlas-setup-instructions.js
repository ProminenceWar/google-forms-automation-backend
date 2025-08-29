/**
 * Instrucciones para configurar MongoDB Atlas
 */

console.log(`
🔧 CONFIGURACIÓN DE MONGODB ATLAS
=================================

❌ ERROR DETECTADO: Tu IP no está en la lista blanca de MongoDB Atlas

📊 TU INFORMACIÓN:
- IP Pública Actual: 190.166.171.100
- Cluster: cluster0.yancr5f.mongodb.net
- Base de datos: google-forms-automation

🚀 PASOS PARA SOLUCIONARLO:

1️⃣  Ve a MongoDB Atlas (https://cloud.mongodb.com)
2️⃣  Inicia sesión con tu cuenta
3️⃣  Selecciona tu proyecto/cluster
4️⃣  Ve a "Network Access" en el menú lateral
5️⃣  Haz clic en "Add IP Address"

🎯 OPCIONES RECOMENDADAS:

OPCIÓN A - Para desarrollo (RECOMENDADA):
- Selecciona "Allow access from anywhere"
- O ingresa: 0.0.0.0/0
- Descripción: "Desarrollo - Todas las IPs"

OPCIÓN B - Solo tu IP actual:
- Ingresa: 190.166.171.100/32
- Descripción: "Mi IP desarrollo"

⚠️  IMPORTANTE:
- La opción A (0.0.0.0/0) es más fácil para desarrollo
- La opción B es más segura pero tendrás que actualizar la IP si cambia
- En producción, usa siempre IPs específicas

🔄 DESPUÉS DE CONFIGURAR:
- Espera 1-2 minutos para que los cambios se propaguen
- Ejecuta: node test-connection.js
- Deberías ver "✅ ¡Conexión exitosa a MongoDB Atlas!"

💡 ALTERNATIVA RÁPIDA:
Si no puedes acceder a Atlas ahora, puedes usar MongoDB local:
- Cambia USE_ATLAS=false en tu archivo .env
- Asegúrate de tener MongoDB instalado localmente
`);
