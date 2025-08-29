## Aprendiendo Node.js y el sistema de Refresh Tokens (explicación detallada)

Este documento te guía línea por línea y palabra por palabra por los conceptos y bloques principales relacionados con el sistema de refresh tokens del proyecto.

---

## Objetivo

- Entender las palabras clave de JavaScript/Node que aparecen en el código.
- Comprender las piezas principales: `TokenService`, `authV2.js`, `authMiddleware.js`, `tokenMaintenance.js` y el script de pruebas.
- Saber qué cambiar para pruebas: credenciales, puerto, rate limiter.

---

## Checklist rápido (qué contiene este documento)

- Palabras clave de JavaScript/Node explicadas.
- Explicación de Express (rutas, middleware, req/res/next).
- Bibliotecas usadas y su propósito.
- Anotaciones por bloques para los archivos clave del proyecto.
- Cómo modificar credenciales y probar localmente.

---

## 1) Glosario de palabras / símbolos comunes ("cada palabra")

Nota: no siempre tiene sentido explicar literalmente "cada palabra" del archivo entero — aquí te doy la explicación de cada palabra clave, símbolo y patrón que verás con frecuencia y que es crítico para entender Node/Express.

- require('modulo')

  - ¿Qué hace? Importa un módulo CommonJS. En Node.js, `require` carga librerías o archivos locales.
  - Ejemplo: `const express = require('express');` carga Express.

- module.exports / exports

  - ¿Qué hace? Expone funciones/objetos desde un archivo para que otros archivos los importen.
  - Ejemplo: `module.exports = TokenService;` permite `const TokenService = require('./services/tokenService');`.

- const / let / var

  - `const` declara una variable que no será reasignada (referencia constante).
  - `let` declara una variable que sí puede reasignarse.
  - `var` es la forma antigua; evita usarla si aprendes buenas prácticas.

- async / await

  - `async` delante de una función indica que devuelve una Promesa y permite usar `await` dentro.
  - `await` detiene la ejecución dentro de la función `async` hasta que la Promesa se resuelva.
  - Ejemplo: `const user = await User.findById(id);`

- try / catch / finally

  - Bloque para capturar errores en código asíncrono o síncrono.
  - `try` ejecuta, `catch` maneja el error, `finally` (opcional) corre siempre.

- Promise

  - Objeto que representa una operación asíncrona que puede resolverse o rechazarse.

- JSON Web Tokens (JWT)

  - `jsonwebtoken` es la librería que firma y verifica JWTs.
  - Access token: corto (ej. 1h). Refresh token: largo (ej. 30d).

- process.env

  - Objeto donde Node guarda variables de entorno (por ejemplo `process.env.PORT`).

- **dirname / **filename

  - Variables globales con la ruta del directorio y nombre del archivo actual.

- class MyClass { }

  - Sintaxis para declarar clases (constructor, métodos). En el proyecto `TokenService` es una clase con métodos estáticos.

- arrow functions: (args) => { }

  - Sintaxis corta para funciones. No tienen su propio `this`.

- template literals: `hola ${nombre}`

  - Cadenas con interpolación usando backticks (`).

- destructuring: const { a, b } = obj;
  - Extrae propiedades de objetos/arrays en variables.

---

## 2) Conceptos Node/Express aplicados

- Express app y Router

  - `const app = express();` crea la aplicación principal.
  - `const router = express.Router();` crea grupos de rutas que luego se montan en `app.use('/ruta', router)`.

- Middleware

  - Función con firma `(req, res, next)` que puede modificar `req` o `res`, o terminar la respuesta.
  - `next()` pasa al siguiente middleware.

- Handlers

  - Rutas usan handlers `(req, res) => { ... }` para enviar respuestas.

- req / res
  - `req` (request) contiene datos de la petición: headers, body, params, query.
  - `res` (response) sirve para enviar status y cuerpos: `res.status(200).json({...})`.

---

## 3) Bibliotecas clave en el proyecto y para qué sirven

- express: framework web para Node.
- mongoose: ODM para MongoDB (modelos y consultas).
- jsonwebtoken: crear/verificar JWTs.
- bcryptjs: hashear/verificar contraseñas.
- express-rate-limit: limitar intentos (protección contra brute-force).
- node-cron: tareas programadas (limpieza periódica).
- winston (logger): logging estructurado.
- axios: cliente HTTP (usado en scripts de prueba).

---

## 4) Archivo: `src/services/tokenService.js` — explicación por bloques

Este archivo centraliza la creación/rotación/validación y revocación de tokens.

- class TokenService { ... }

  - Contiene métodos estáticos como `generateTokenPair`, `refreshAccessToken`, `revokeRefreshToken`.

- generateTokenPair(userId, additionalClaims)

  - Busca el usuario con `User.findById(userId)`.
  - Limpia tokens expirados: `user.cleanExpiredTokens()` (método en modelo `User`).
  - Crea payload para `accessToken` (claims: id, email, role, iat).
  - Firma el token: `jwt.sign(payload, config.jwt.secret, { expiresIn })`.
  - Genera refresh token con id único: `crypto.randomUUID()` y firma con `config.jwt.refreshSecret`.
  - Calcula `expiresAt` y guarda el refresh token en el usuario: `user.addRefreshToken(refreshToken, expiresAt)`.

- refreshAccessToken(refreshToken)

  - Verifica token con `jwt.verify(refreshToken, config.jwt.refreshSecret)`.
  - Verifica que el token exista en `user.refreshTokens` y no esté expirado.
  - Si `rotateToken` activo, elimina el refresh token usado `user.removeRefreshToken(refreshToken)` (rotación).
  - Llama a `generateTokenPair` para crear nuevos tokens.

- revokeRefreshToken(userId, refreshToken)

  - Busca usuario y usa `user.removeRefreshToken(refreshToken)`.

- revokeAllRefreshTokens(userId)
  - Vacía `user.refreshTokens = []` y guarda.

Consejos para modificar:

- Cambiar duración de tokens en `src/config/index.js` (JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN).
- Añadir `deviceId` u `ip` al payload y guardarlo junto al refresh token en BD si quieres tracking por dispositivo.

---

## 5) Archivo: `src/routes/authV2.js` — explicación por bloques

- importaciones y rateLimit

  - `const router = express.Router();` crea un router para agrupar las rutas de autenticación.
  - `authLimiter` y `refreshLimiter` protegen endpoints `login` y `refresh`.

- POST /login

  - Validadores: `express-validator` revisa `email` y `password`.
  - Busca usuario por email y compara contraseñas con `bcryptjs.compare(password, user.password)`.
  - Genera tokens con `TokenService.generateTokenPair(user._id)` y devuelve `accessToken` y `refreshToken`.

- POST /refresh

  - Valida `refreshToken` en el body.
  - Llama `TokenService.refreshAccessToken(refreshToken)` que implementa rotación.

- POST /logout

  - Endpoint protegido con `authenticateToken` (debe enviar access token en header).
  - Revoca el refresh token que se pasa en el body (logout simple).

- POST /logout-all

  - Revoca todos los tokens del usuario (útil para 'cerrar todas las sesiones').

- GET /token-info
  - Usa `TokenService.getTokenInfo(userId)` para mostrar tokens activos (fechas, expiración).

Consejos:

- Si cambias el nombre de la ruta, recuerda actualizar `src/app.js` donde se monta `app.use('/api/auth', authV2Routes);`.

---

## 6) Archivo: `src/middleware/authMiddleware.js` — explicación por bloques

- Propósito: validar access tokens en cada request.

- Flujo:
  1. Leer header `Authorization` y extraer token: `const token = authHeader && authHeader.split(' ')[1];`.
  2. Validar token con `TokenService.validateAccessToken(token)` que internamente usa `jwt.verify`.
  3. Buscar usuario `User.findById(decoded.id)` y verificar `user.active`.
  4. Adjuntar `req.user = { id, email, role, ... }` para que handlers posteriores usen los datos.
  5. Manejar errores específicos: `JsonWebTokenError`, `TokenExpiredError`, `NotBeforeError`.

Consejo práctico:

- Si quieres permitir rutas públicas, no uses este middleware en esas rutas.

---

## 7) Archivo: `src/middleware/tokenMaintenance.js` — explicación

- Usa `node-cron` para programar tareas:

  - Tarea cada hora: `cron.schedule('0 * * * *', async () => { ... })`.
  - Tarea cada 6 horas para limpieza intensiva y estadísticas.

- Métodos útiles:
  - `manualCleanup` middleware que ejecuta limpieza cuando un admin hace POST `/api/admin/tokens/cleanup`.
  - `healthCheck` que agrega `req.healthStatus` con datos de DB y TokenService.

---

## 8) Script de pruebas: `test-refresh-tokens-educativo.js` — explicación

- Usa `axios` para simular peticiones al servidor.
- Flujo de pruebas:
  1. `login` para obtener tokens.
  2. `GET /api/auth/me` con access token para validar acceso.

3.  `POST /api/auth/refresh` con refresh token para rotación.
4.  `GET /api/auth/token-info` para ver tokens activos.
5.  `GET /api/v1/forms` para probar un endpoint de negocio.
6.  `POST /api/auth/logout` para revocar refresh.

Tips para principiantes:

- Cambia `TEST_CREDENTIALS` para usar el usuario que tengas en la BD.
- Si tienes rate limiter activo y estás en desarrollo, en `src/routes/authV2.js` la opción `skip: () => process.env.NODE_ENV === 'development'` permite omitir el limite.

---

## 9) Guía rápida: cómo modificar credenciales y probar

1. Asegúrate de que el servidor está corriendo (ver `PORT` en `src/config/index.js` o variable `PORT`).
2. Si no tienes el usuario de prueba, ejecuta `node verify-users.js` para listar o crear `admin@fso-automation.com` con password `admin123`.
3. Ejecuta el script educativo:

```powershell
node test-refresh-tokens-educativo.js
```

4. Lee los mensajes en consola: te explican cada paso.

---

## 10) Ejemplo de cambios comunes que querrás hacer

- Cambiar duración de refresh: modificar `JWT_REFRESH_EXPIRES_IN` en `src/config/index.js`.
- Añadir `deviceId` en `TokenService.generateTokenPair` y almacenarlo en `user.refreshTokens`.
- Hacer que `logout` solo acepte el refresh token presente en cookie en vez de body (mejor practica para apps web).

---

## 11) Recursos para seguir aprendiendo Node.js

- Documentación Node: https://nodejs.org/en/docs/
- Express: https://expressjs.com/
- Mongoose: https://mongoosejs.com/
- JWT best practices: buscar "JWT token rotation" y "refresh token rotation".

---

Si quieres, puedo ahora:

- 1. Generar una versión anotada (línea por línea) de `src/services/tokenService.js` dentro del mismo `docs/` (más verboso).
- 2. Crear pequeños ejercicios paso-a-paso para que practiques (modificar expiración, agregar deviceId, etc.).

Indica cuál prefieres y continúo.
