# Guía de Desarrollo - Google Forms Automation Backend

## 📋 Tabla de Contenidos

- [Configuración del Entorno](#configuración-del-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Implementación de Endpoints](#implementación-de-endpoints)
- [Mejores Prácticas](#mejores-prácticas)
- [Testing](#testing)
- [Deployment](#deployment)

## 🛠️ Configuración del Entorno

### Prerrequisitos

- Node.js >= 16.0.0
- MongoDB >= 5.0
- Git
- Editor de código (VS Code recomendado)

### Configuración Inicial

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

3. **Configurar MongoDB**

   - Instalación local o usar MongoDB Atlas
   - Actualizar `DB_CONNECTION_STRING` en `.env`

4. **Configurar JWT secrets**
   ```bash
   # Generar secret seguro
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## 🏗️ Estructura del Proyecto

### Organización de Carpetas

```
src/
├── config/                 # Configuración del sistema
├── constants/             # Constantes y enums
├── controllers/           # Lógica de controladores
├── database/              # Configuración de DB
├── middleware/            # Middleware personalizado
├── models/                # Modelos de datos
├── routes/                # Definición de rutas
├── services/              # Lógica de negocio
├── utils/                 # Utilidades generales
└── validators/            # Validación de datos
```

### Convenciones de Nomenclatura

- **Archivos**: camelCase (ej: `userController.js`)
- **Clases**: PascalCase (ej: `class UserService`)
- **Variables**: camelCase (ej: `const userName`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `const MAX_FILE_SIZE`)
- **Funciones**: camelCase (ej: `function createUser()`)

## 🚀 Implementación de Endpoints

### Pasos para Crear un Nuevo Endpoint

1. **Definir el modelo** (si es necesario)

   ```javascript
   // src/models/NewModel.js
   const mongoose = require("mongoose");

   const newModelSchema = new mongoose.Schema({
     // definir campos
   });

   module.exports = mongoose.model("NewModel", newModelSchema);
   ```

2. **Crear validadores**

   ```javascript
   // src/validators/newValidators.js
   const Joi = require("joi");

   const newValidators = {
     create: Joi.object({
       // definir validaciones
     }),
   };

   module.exports = newValidators;
   ```

3. **Implementar servicio**

   ```javascript
   // src/services/newService.js
   const NewModel = require("../models/NewModel");

   class NewService {
     async create(data) {
       // lógica de negocio
     }
   }

   module.exports = new NewService();
   ```

4. **Crear controlador**

   ```javascript
   // src/controllers/newController.js
   const newService = require("../services/newService");
   const {
     successResponse,
     errorResponse,
   } = require("../utils/responseHelper");

   class NewController {
     async create(req, res) {
       try {
         const result = await newService.create(req.body);
         return successResponse(res, result, "Creado exitosamente", 201);
       } catch (error) {
         return errorResponse(res, error);
       }
     }
   }

   module.exports = new NewController();
   ```

5. **Definir rutas**

   ```javascript
   // src/routes/new.js
   const express = require("express");
   const newController = require("../controllers/newController");
   const { validateBody } = require("../validators");
   const { auth } = require("../middleware/auth");

   const router = express.Router();

   router.post(
     "/",
     auth,
     validateBody(validators.new.create),
     newController.create
   );

   module.exports = router;
   ```

6. **Registrar rutas**

   ```javascript
   // src/routes/index.js
   const newRoutes = require("./new");

   // En la función de configuración
   app.use("/api/v1/new", newRoutes);
   ```

## 📝 Mejores Prácticas

### Código Limpio

1. **Separación de responsabilidades**

   - Controladores: solo manejan HTTP
   - Servicios: lógica de negocio
   - Modelos: definición de datos

2. **Manejo de errores consistente**

   ```javascript
   // ✅ Correcto
   try {
     const result = await service.method();
     return successResponse(res, result);
   } catch (error) {
     logger.error("Error description:", error);
     return errorResponse(res, error);
   }

   // ❌ Incorrecto
   service
     .method()
     .then((result) => {
       res.json(result);
     })
     .catch((err) => {
       res.status(500).json({ error: err.message });
     });
   ```

3. **Validación de entrada**

   ```javascript
   // ✅ Siempre validar entrada
   router.post("/", validateBody(schema), controller.method);

   // ❌ No confiar en datos sin validar
   router.post("/", controller.method);
   ```

### Seguridad

1. **Autenticación obligatoria**

   ```javascript
   // ✅ Rutas protegidas
   router.get("/private", auth, controller.method);

   // ✅ Verificar permisos
   router.delete("/:id", auth, checkOwnership, controller.delete);
   ```

2. **Sanitización de datos**

   ```javascript
   // ✅ Usar validadores con sanitización
   const schema = Joi.object({
     name: Joi.string().trim().max(100),
   });
   ```

3. **Rate limiting apropiado**
   ```javascript
   // ✅ Diferentes límites por endpoint
   router.post("/upload", uploadRateLimit, controller.upload);
   router.post("/auth/login", authRateLimit, controller.login);
   ```

### Performance

1. **Paginación obligatoria**

   ```javascript
   // ✅ Siempre paginar listas
   router.get("/", validatePagination(), controller.list);
   ```

2. **Índices de base de datos**

   ```javascript
   // ✅ Crear índices para consultas frecuentes
   userSchema.index({ email: 1 }, { unique: true });
   userSchema.index({ role: 1, active: 1 });
   ```

3. **Campos selectivos**

   ```javascript
   // ✅ Seleccionar solo campos necesarios
   const users = await User.find().select("name email role");

   // ❌ Evitar seleccionar todo
   const users = await User.find();
   ```

## 🧪 Testing

### Estructura de Tests

```
tests/
├── integration/           # Tests de integración
│   ├── auth.test.js
│   ├── fso.test.js
│   └── files.test.js
├── unit/                  # Tests unitarios
│   ├── services/
│   ├── controllers/
│   └── utils/
├── fixtures/              # Datos de prueba
└── helpers/               # Utilidades para tests
```

### Configuración de Tests

```javascript
// tests/setup.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

### Ejemplo de Test

```javascript
// tests/integration/auth.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("Auth Endpoints", () => {
  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch

# Tests específicos
npm test -- --grep "Auth"
```

## 🚀 Deployment

### Configuración de Producción

1. **Variables de entorno**

   ```env
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-super-secure-secret-key
   DB_CONNECTION_STRING=mongodb://your-production-server/database
   ```

2. **Configuración de PM2**

   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: "fso-backend",
         script: "src/app.js",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "development",
         },
         env_production: {
           NODE_ENV: "production",
         },
       },
     ],
   };
   ```

3. **Dockerfile**
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   USER node
   CMD ["npm", "start"]
   ```

### Checklist de Deployment

- [ ] Variables de entorno configuradas
- [ ] Base de datos configurada y migrada
- [ ] Logs configurados para producción
- [ ] Monitoreo configurado
- [ ] SSL/TLS configurado
- [ ] Rate limiting configurado
- [ ] Backups automáticos configurados
- [ ] Health checks configurados

## 📊 Monitoreo

### Métricas Importantes

1. **Rendimiento**

   - Tiempo de respuesta de API
   - Throughput (requests/segundo)
   - Uso de memoria y CPU

2. **Errores**

   - Rate de errores 4xx/5xx
   - Errores de base de datos
   - Fallos de autenticación

3. **Negocio**
   - Formularios creados por día
   - Usuarios activos
   - Archivos procesados

### Health Checks

```javascript
// src/routes/health.js
router.get("/health", async (req, res) => {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabase(),
    memory: process.memoryUsage(),
    disk: await checkDiskSpace(),
  };

  res.json(checks);
});
```

## 🔧 Troubleshooting

### Problemas Comunes

1. **Error de conexión a MongoDB**

   ```bash
   # Verificar conexión
   mongosh "mongodb://localhost:27017/google_forms_automation"
   ```

2. **Error de JWT**

   ```bash
   # Verificar JWT_SECRET en .env
   echo $JWT_SECRET
   ```

3. **Error de permisos de archivos**

   ```bash
   # Verificar permisos del directorio storage
   ls -la storage/
   chmod 755 storage/
   ```

4. **Error de rate limiting**
   ```bash
   # Verificar configuración en .env
   echo $RATE_LIMIT_MAX_REQUESTS
   ```

### Logs de Debug

```javascript
// Habilitar logs detallados
process.env.LOG_LEVEL = 'debug';

// Ver logs específicos
tail -f logs/app.log | grep ERROR
```

## 📚 Recursos Adicionales

- [Documentación de Mongoose](https://mongoosejs.com/docs/)
- [Joi Validation](https://joi.dev/api/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/performance-best-practices/)

## 🆘 Soporte

Si encuentras problemas:

1. Revisa esta guía de desarrollo
2. Consulta los logs de la aplicación
3. Verifica la configuración de variables de entorno
4. Busca en issues existentes del repositorio
5. Crea un nuevo issue con detalles del problema
