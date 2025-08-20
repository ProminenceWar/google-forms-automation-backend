# 🌐 Configuración de MongoDB Atlas

Esta guía te ayudará a conectar tu aplicación FSO Automation Backend con MongoDB Atlas.

## 📋 Requisitos Previos

1. Cuenta de [MongoDB Atlas](https://cloud.mongodb.com/)
2. Cluster configurado en MongoDB Atlas
3. Usuario de base de datos creado con permisos adecuados
4. IP agregada a la lista blanca de conexiones

## 🚀 Configuración Paso a Paso

### 1. Configurar MongoDB Atlas

1. **Crear un Cluster**:

   - Ve a [MongoDB Atlas](https://cloud.mongodb.com/)
   - Crea un nuevo proyecto o usa uno existente
   - Crea un cluster (recomendado: M0 Sandbox para desarrollo)

2. **Crear Usuario de Base de Datos**:

   - Ve a `Database Access`
   - Crea un nuevo usuario
   - Asigna rol `readWrite` para la base de datos
   - Guarda las credenciales (usuario y contraseña)

3. **Configurar Network Access**:

   - Ve a `Network Access`
   - Agrega tu IP actual o `0.0.0.0/0` para acceso completo (solo desarrollo)

4. **Obtener String de Conexión**:
   - Ve a `Clusters` > `Connect` > `Connect your application`
   - Copia el string de conexión (formato: `mongodb+srv://...`)

### 2. Configurar Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

Edita el archivo `.env` y configura las variables de Atlas:

```bash
# Habilitar uso de Atlas
USE_ATLAS=true

# Credenciales de MongoDB Atlas
MONGODB_ATLAS_USERNAME=tu-usuario-atlas
MONGODB_ATLAS_PASSWORD=tu-contraseña-atlas
MONGODB_ATLAS_CLUSTER=tu-cluster.mongodb.net
MONGODB_ATLAS_DATABASE=fso-automation

# Configuración opcional
MONGODB_ATLAS_RETRY_WRITES=true
MONGODB_ATLAS_W=majority
```

### 3. Probar la Conexión

Ejecuta el script de conexión para verificar que todo esté configurado correctamente:

```bash
# Probar conexión a Atlas
npm run connect-atlas
```

Este script:

- ✅ Verifica la conexión a MongoDB Atlas
- 🏗️ Configura las colecciones necesarias
- 📑 Crea índices optimizados
- 🏥 Ejecuta verificaciones de salud

### 4. Configurar Base de Datos

Una vez confirmada la conexión, ejecuta la configuración inicial:

```bash
# Configurar base de datos con datos de ejemplo
npm run setup-db
```

### 5. Ejecutar Playground (Opcional)

Para ejecutar queries y configurar datos adicionales:

```bash
# Ejecutar script de playground en MongoDB
npm run playground
```

## 🔧 Scripts Disponibles

| Script                  | Descripción                                   |
| ----------------------- | --------------------------------------------- |
| `npm run connect-atlas` | Prueba conexión y configura Atlas             |
| `npm run setup-db`      | Inicializa base de datos con datos de ejemplo |
| `npm run playground`    | Ejecuta script de playground MongoDB          |
| `npm run health`        | Verifica estado de salud de la base de datos  |
| `npm start`             | Inicia la aplicación                          |
| `npm run dev`           | Inicia en modo desarrollo                     |

## 🔍 Verificación de Estado

Puedes verificar el estado de la conexión de varias formas:

### 1. Health Check

```bash
npm run health
```

### 2. Logs de la Aplicación

```bash
# Ver logs en tiempo real
npm run logs

# Ver logs de errores
npm run logs:error
```

### 3. Endpoint de Health Check

Una vez que la aplicación esté ejecutándose:

```bash
curl http://localhost:3000/api/v1/health
```

## 🌍 Variables de Entorno

### Variables Requeridas para Atlas

| Variable                 | Descripción           | Ejemplo                       |
| ------------------------ | --------------------- | ----------------------------- |
| `USE_ATLAS`              | Habilita uso de Atlas | `true`                        |
| `MONGODB_ATLAS_USERNAME` | Usuario de Atlas      | `mi-usuario`                  |
| `MONGODB_ATLAS_PASSWORD` | Contraseña de Atlas   | `mi-contraseña`               |
| `MONGODB_ATLAS_CLUSTER`  | URL del cluster       | `cluster0.abc123.mongodb.net` |

### Variables Opcionales

| Variable                     | Descripción                | Por Defecto      |
| ---------------------------- | -------------------------- | ---------------- |
| `MONGODB_ATLAS_DATABASE`     | Nombre de la base de datos | `fso-automation` |
| `MONGODB_ATLAS_RETRY_WRITES` | Reintentos de escritura    | `true`           |
| `MONGODB_ATLAS_W`            | Write Concern              | `majority`       |

## 🔒 Seguridad

### Recomendaciones de Producción

1. **Usuarios Específicos**: Crea usuarios con permisos mínimos necesarios
2. **Network Access**: Restringe acceso solo a IPs necesarias
3. **Encriptación**: Habilita encriptación en tránsito y en reposo
4. **Monitoreo**: Configura alertas en Atlas para detectar actividad inusual
5. **Backups**: Habilita backups automáticos

### Variables Sensibles

Nunca commites las siguientes variables en tu repositorio:

- `MONGODB_ATLAS_USERNAME`
- `MONGODB_ATLAS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

## 🐛 Solución de Problemas

### Error: "Authentication failed"

- Verifica usuario y contraseña en Atlas
- Confirma que el usuario tenga permisos en la base de datos

### Error: "Connection timeout"

- Verifica configuración de Network Access
- Confirma que tu IP esté en la lista blanca

### Error: "Database not found"

- Verifica que `MONGODB_ATLAS_DATABASE` esté correctamente configurado
- Ejecuta `npm run setup-db` para crear las colecciones

### Error: "Too many connections"

- Ajusta `DB_MAX_POOL_SIZE` en el archivo `.env`
- Verifica que no haya conexiones colgadas

## 📚 Recursos Adicionales

- [Documentación MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Best Practices MongoDB](https://docs.mongodb.com/manual/administration/production-notes/)

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `npm run logs:error`
2. Ejecuta health check: `npm run health`
3. Verifica configuración en MongoDB Atlas
4. Consulta la documentación oficial de MongoDB Atlas

---

> 💡 **Tip**: Para desarrollo local, puedes usar `USE_ATLAS=false` y una instancia local de MongoDB para mayor velocidad y menor latencia.
