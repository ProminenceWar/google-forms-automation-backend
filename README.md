# Google Forms Automation Backend

## 📋 Descripción

Backend API para la automatización de formularios FSO (Field Service Operations) con gestión integral de datos, procesamiento de archivos PDF, y sistema de autenticación robusto.

## 🚀 Características

- ✅ Automatización de formularios de Google con Puppeteer
- ✅ Gestión de sesión persistente con cookies
- ✅ API REST completa con endpoints organizados
- ✅ Logging con Winston
- ✅ Middleware de seguridad (Helmet, CORS, Rate Limiting)
- ✅ Manejo centralizado de errores
- ✅ Integración completa con MongoDB Atlas
- ✅ Datos reales desde base de datos
- ✅ Configuración flexible con variables de entorno
- ✅ Estructura de carpetas escalable

## 📁 Estructura del Proyecto

```
src/
├── app.js                    # Aplicación principal Express
├── config/
│   └── index.js             # Configuración centralizada
├── controllers/
│   ├── sessionController.js # Controlador de sesiones
│   └── formController.js    # Controlador de formularios
├── middleware/
│   └── errorHandler.js      # Middleware de manejo de errores
├── routes/
│   ├── session.js           # Rutas de sesión
│   └── forms.js             # Rutas de formularios
├── services/
│   ├── sessionService.js    # Servicio de gestión de sesión
│   └── puppeteerService.js  # Servicio de automatización
└── utils/
    ├── logger.js            # Configuración de logging
    └── logger.js           # Sistema de logging
```

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/ProminenceWar/google-forms-automation-backend.git
cd google-forms-automation-backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar el archivo `.env` con tus configuraciones:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Forms Configuration
GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform

# Session Configuration
SESSION_TIMEOUT=3600000      # 1 hora en milisegundos
MAX_SESSION_AGE=86400000     # 24 horas en milisegundos

# Rate Limiting
MAX_REQUESTS_PER_WINDOW=100  # Máximo 100 requests
RATE_LIMIT_WINDOW=900000     # En 15 minutos

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 4. Crear directorios necesarios

```bash
mkdir -p sessions logs
```

## 🏃‍♂️ Ejecutar la aplicación

### Modo desarrollo (con nodemon)

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

### Ejecutar tests

```bash
npm test
```

El servidor iniciará en `http://localhost:3000` (o el puerto configurado en `.env`).

## 📚 API Endpoints

### 🔐 Gestión de Sesión

#### `POST /api/session/login`

Inicia el proceso de login manual en Google.

**Response:**

```json
{
  "success": true,
  "message": "Manual authentication required",
  "requiresManualAuth": true,
  "instructions": "Please complete the Google login process in your browser window"
}
```

#### `GET /api/session/status`

Verifica el estado actual de la sesión.

**Response:**

```json
{
  "session": {
    "isValid": true,
    "isAuthenticated": true,
    "savedAt": "2024-01-01T12:00:00.000Z",
    "expiresAt": "2024-01-02T12:00:00.000Z",
    "cookieCount": 15
  },
  "browser": {
    "isInitialized": true
  }
}
```

#### `POST /api/session/logout`

Cierra la sesión actual y limpia cookies.

#### `POST /api/session/refresh`

Actualiza la actividad de la sesión.

### 📝 Gestión de Formularios

#### `POST /api/forms/submit`

Envía datos a un formulario de Google.

**Request Body:**

```json
{
  "formUrl": "https://docs.google.com/forms/d/e/1FAIpQLSexample/viewform",
  "formData": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "message": "Este es un mensaje de prueba"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Form submitted successfully",
  "details": {
    "filledFields": 3,
    "finalUrl": "https://docs.google.com/forms/d/e/1FAIpQLSexample/formResponse"
  }
}
```

#### `GET /api/forms/sample-data`

Obtiene datos de muestra desde MongoDB.

**Response:**

```json
{
  "success": true,
  "message": "Sample data retrieved successfully",
  "data": [
    {
      "_id": "...",
      "numeroOrden": "ORD-2025-001",
      "tipoFSO": "instalacion",
      "companiaInspeccion": "TecNetwork Solutions",
      "nombreTecnico": "Juan Pérez Martínez",
      "estado": "completado"
    }
  ],
  "count": 3
}
```

#### `GET /api/forms/validate-url`

Valida si una URL es un formulario de Google válido.

**Query Parameters:**

- `url`: URL del formulario a validar

#### `POST /api/forms/test-submit`

Realiza una prueba de envío con datos mock.

**Request Body:**

```json
{
  "formUrl": "https://docs.google.com/forms/d/e/1FAIpQLSexample/viewform",
  "mockType": "basic"
}
```

### 🔍 Utilidades

#### `GET /health`

Health check del servidor.

#### `GET /api`

Documentación de la API.

## 🔧 Configuración Avanzada

### Variables de Entorno Disponibles

| Variable                  | Descripción                    | Valor por Defecto |
| ------------------------- | ------------------------------ | ----------------- |
| `PORT`                    | Puerto del servidor            | `3000`            |
| `NODE_ENV`                | Entorno de ejecución           | `development`     |
| `GOOGLE_FORM_URL`         | URL del formulario por defecto | -                 |
| `SESSION_TIMEOUT`         | Timeout de inactividad (ms)    | `3600000` (1h)    |
| `MAX_SESSION_AGE`         | Edad máxima de sesión (ms)     | `86400000` (24h)  |
| `MAX_REQUESTS_PER_WINDOW` | Límite de requests             | `100`             |
| `RATE_LIMIT_WINDOW`       | Ventana de rate limit (ms)     | `900000` (15min)  |
| `LOG_LEVEL`               | Nivel de logging               | `info`            |
| `LOG_FILE`                | Archivo de logs                | `logs/app.log`    |

### Estructura de Logs

Los logs se almacenan en:

- `logs/app.log` - Logs generales
- `logs/app-error.log` - Solo errores

### Gestión de Sesión

Las sesiones se almacenan en:

- `sessions/session.json` - Cookies de sesión
- `sessions/chrome-profile/` - Perfil de Chrome (Puppeteer)

## 🧪 Testing

### Probar la API

1. **Health Check:**

```bash
curl http://localhost:3000/health
```

2. **Iniciar sesión:**

```bash
curl -X POST http://localhost:3000/api/session/login
```

3. **Verificar estado:**

```bash
curl http://localhost:3000/api/session/status
```

4. **Obtener datos mock:**

```bash
curl http://localhost:3000/api/forms/sample-data
```

5. **Enviar formulario de prueba:**

```bash
curl -X POST http://localhost:3000/api/forms/test-submit \
  -H "Content-Type: application/json" \
  -d '{
    "formUrl": "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",
    "mockType": "basic"
  }'
```

## 🔒 Seguridad

- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ Rate limiting implementado
- ✅ Validación de entrada
- ✅ Manejo seguro de errores
- ✅ Logs de auditoría

## 🚀 Despliegue en Producción

### Variables de Entorno para Producción

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
# ... otras configuraciones
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
npm start        # Ejecutar en producción
npm run dev      # Ejecutar en desarrollo con nodemon
npm test         # Ejecutar tests
```

### Agregar Nuevas Funcionalidades

1. **Nuevo controlador:** Crear archivo en `src/controllers/`
2. **Nuevo servicio:** Crear archivo en `src/services/`
3. **Nuevas rutas:** Crear archivo en `src/routes/`
4. **Nuevo middleware:** Crear archivo en `src/middleware/`

## 📝 Logs y Monitoreo

### Niveles de Log Disponibles

- `error`: Errores críticos
- `warn`: Advertencias
- `info`: Información general
- `debug`: Información de debug

### Ejemplo de Log

```json
{
  "level": "info",
  "message": "Form submission completed",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "google-forms-automation",
  "details": {
    "success": true,
    "filledFields": 3
  }
}
```

## 🤝 Contribuciones

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🐛 Reportar Problemas

Si encuentras algún problema, por favor créalo en [GitHub Issues](https://github.com/ProminenceWar/google-forms-automation-backend/issues).

## 📞 Soporte

Para soporte adicional, contacta a [ProminenceWar](https://github.com/ProminenceWar).

---

⭐ **¡No olvides dar una estrella al proyecto si te resulta útil!**
