# tokenService.js — Explicado para un novato completo

Este documento explica, paso a paso y con ejemplos sencillos, qué hace el archivo `src/services/tokenService.js` de este proyecto. Está pensado para alguien que nunca usó Node.js y quiere entender cómo funciona el servicio de tokens (JWT) usado en la aplicación.

## Breve plan

- Qué es este archivo y por qué existe
- Conceptos básicos (JWT, access vs refresh token)
- Dependencias y piezas del proyecto que se usan
- Explicación función por función (en lenguaje simple)
- Ejemplos mínimos de uso
- Cómo probarlo localmente
- Errores comunes y cómo depurarlos

---

## ¿Para qué sirve `tokenService.js`?

Es un servicio central que se encarga de crear, validar, rotar y anular (revocar) los tokens de autenticación que usa la aplicación. Los tokens permiten que el servidor reconozca a un usuario sin pedir contraseña en cada petición.

Piensa en esto como la "oficina de credenciales" de la app: guarda constancias (refresh tokens) en la base de datos y entrega comprobantes temporales (access tokens) para usar la API.

## Conceptos básicos (sin jerga)

- JWT (JSON Web Token): es una cadena (texto) que contiene datos firmados por el servidor. Sirve para decir "este token prueba que eres X". Tiene fecha de expiración.
- Access token: token corto (ej. 1 hora). Se envía al servidor para autorizar llamadas a la API.
- Refresh token: token largo (ej. 30 días). Sirve para pedir un nuevo access token cuando el anterior expiró. Normalmente se guarda en la base de datos para poder revocarlo.
- Rotación de refresh tokens: cuando usas un refresh token para pedir nuevos tokens, el servicio puede invalidar (eliminar) el refresh token usado y crear uno nuevo para mayor seguridad.

## ¿Qué archivos y librerías usa este servicio?

- `jsonwebtoken` (paquete npm): crea y verifica JWTs.
- `crypto` (módulo nativo de Node): para crear IDs únicos de refresh token (randomUUID).
- `src/models/User.js`: el modelo de usuario, aquí se espera que tenga métodos como `findById`, `addRefreshToken`, `removeRefreshToken`, `cleanExpiredTokens`, `save` y la propiedad `refreshTokens`.
- `src/config/index.js` (accesible como `config`): contiene secretos y tiempos de expiración (`config.jwt.secret`, `config.jwt.refreshSecret`, `config.jwt.expiresIn`, `config.jwt.refreshExpiresIn`).
- `src/utils/logger.js`: para registrar información y errores.

Si alguno de esos no existe o tiene otro nombre, el servicio fallará. Verifica esos archivos si algo no funciona.

## Explicación general del flujo

1. Cuando un usuario inicia sesión correctamente, se llama `generateTokenPair(userId)`.
   - Se crea un access token (corto) firmado con `config.jwt.secret`.
   - Se crea un refresh token (largo) firmado con `config.jwt.refreshSecret` y se guarda en la BD dentro del documento del usuario.
2. Cuando el access token expira, el cliente usa el refresh token y llama a `refreshAccessToken(refreshToken)`.
   - El servicio verifica el refresh token (firma, tipo) y comprueba que exista y no esté expirado en la BD.
   - Si todo está bien, crea y devuelve nuevos tokens. Opcionalmente elimina (rota) el refresh token usado.
3. También hay funciones para revocar un refresh token (por ejemplo al cerrar sesión) y para limpiar tokens expirados.

---

## Función por función (en lenguaje simple)

### 1) generateTokenPair(userId, additionalClaims = {})

Qué hace:

- Busca el usuario por `userId`.
- Limpia (borra) cualquier refresh token expirado del usuario.
- Crea un access token con datos básicos (id, email, role, company) y cualquier claim adicional.
- Crea un refresh token con un `tokenId` único y lo guarda en la BD con su fecha de expiración.
- Devuelve `{ accessToken, refreshToken, expiresIn, refreshExpiresIn }`.

Por qué importa:

- Da al cliente dos tokens: uno para usar en la API (access) y otro para renovar (refresh).

Precondiciones:

- `userId` debe existir en la BD y el usuario debe estar activo.
- `config.jwt.secret` y `config.jwt.refreshSecret` deben estar definidos.

Posibles problemas:

- Si no existe el usuario o está inactivo, lanza error.
- Si `config` no tiene los secretos, `jsonwebtoken` fallará.

---

### 2) refreshAccessToken(refreshToken, options = {})

Qué hace:

- Verifica la firma del refresh token usando `config.jwt.refreshSecret`.
- Chequea que el token tenga `type: 'refresh'` y un `tokenId`.
- Busca al usuario por el `id` dentro del token y comprueba que el refresh token esté registrado y no expirado.
- Si el token no existe o está expirado: registra un aviso de seguridad, borra todos los refresh tokens del usuario y lanza error.
- Si `options.rotateToken !== false`, remueve el refresh token usado (rotación).
- Llama a `generateTokenPair(...)` para crear nuevos tokens y los devuelve.

Notas de seguridad:

- Si detecta uso de un refresh token que ya no está en la BD, asume posible compromiso y borra todos los refresh tokens del usuario.

Errores comunes:

- `TokenExpiredError`: el refresh token expiró.
- `JsonWebTokenError`: token malformado o firma inválida.

---

### 3) revokeRefreshToken(userId, refreshToken)

Qué hace:

- Busca el usuario y llama a `user.removeRefreshToken(refreshToken)`.
- Devuelve `true` si todo fue bien, `false` si ocurrió un error o no existe el usuario.

Uso típico:

- Al cerrar sesión de un dispositivo concreto, revocas el refresh token asociado.

---

### 4) revokeAllRefreshTokens(userId)

Qué hace:

- Busca el usuario, cuenta cuantos refresh tokens tenía, los borra todos (`user.refreshTokens = []`) y guarda el usuario.
- Útil cuando quieres cerrar sesión de todos los dispositivos o ante sospecha de compromiso.

---

### 5) validateAccessToken(accessToken)

Qué hace:

- Verifica el access token con `config.jwt.secret`.
- Comprueba que el usuario exist a y esté activo.
- Devuelve el payload decodificado si todo está bien.

Uso típico:

- Middleware de autenticación en rutas: extraes el access token de la cabecera `Authorization` y lo validas.

---

### 6) cleanupExpiredTokens()

Qué hace:

- Busca todos los usuarios que tienen refresh tokens y les llama `cleanExpiredTokens()`.
- Devuelve la cantidad de usuarios que tuvieron tokens limpiados.

Uso típico:

- Tarea cron o job periódico para mantener la BD limpia.

---

### 7) getTokenInfo(userId)

Qué hace:

- Devuelve un resumen de los refresh tokens activos del usuario (fechas de creación, expiración y si ya expiraron).
- Llama a `cleanExpiredTokens()` antes de leer para que la información esté actualizada.

---

## Ejemplos mínimos de uso (scripts cortos)

1. Generar tokens para un usuario (ejecutar desde la raíz del proyecto):

```powershell
# Crear un archivo temporal generate.js
# Contenido (ejemplo):
# const TokenService = require('./src/services/tokenService');
# (async () => {
#   const userId = 'ID_DEL_USUARIO';
#   const tokens = await TokenService.generateTokenPair(userId);
#   console.log(tokens);
# })();

node .\generate.js
```

2. Renovar con refresh token:

```powershell
# Archivo refresh.js
# const TokenService = require('./src/services/tokenService');
# (async () => {
#   const refreshToken = 'REFRESH_TOKEN_AQUI';
#   const newTokens = await TokenService.refreshAccessToken(refreshToken);
#   console.log(newTokens);
# })();

node .\refresh.js
```

Importante: en los ejemplos reales debes reemplazar `ID_DEL_USUARIO` y `REFRESH_TOKEN_AQUI` y asegurarte de tener conexión a la base de datos (MongoDB) porque el servicio consulta y actualiza el `User`.

---

## Requisitos para que todo funcione (lista mínima)

- Variables y secretos en `config`:
  - `config.jwt.secret` (secreto para access tokens)
  - `config.jwt.refreshSecret` (secreto para refresh tokens)
  - `config.jwt.expiresIn` (ej. '1h')
  - `config.jwt.refreshExpiresIn` (ej. '30d')
- Modelo `User` implementado con métodos usados:
  - `User.findById(id)` (devuelve el documento del usuario)
  - `user.addRefreshToken(token, expiresAt)`
  - `user.removeRefreshToken(token)`
  - `user.cleanExpiredTokens()`
  - `user.save()`
- Conexión a la base de datos activa.

Si alguno falta, verás errores al ejecutar las funciones.

---

## Errores comunes y cómo depurarlos (pasos rápidos)

- Error: "Usuario no válido" ⇒ Revisa que el `userId` exista y tenga `active: true`.
- Error: "Refresh token expirado" ⇒ El refresh token venció: pide al usuario que vuelva a iniciar sesión.
- Error: Configuración faltante (`secret` undefined) ⇒ Abre `src/config/index.js` y verifica que las variables estén.
- Error: métodos undefined en `user` ⇒ Abre `src/models/User.js` y confirma que existan los métodos mencionados.
- Para depurar, agrega `console.log(...)` o usa el `logger` del proyecto (recomendado).

---

## Consejos prácticos para un novato en Node.js

- Ejecuta Node.js desde PowerShell: `node archivo.js`.
- Usa `npm install` o `pnpm install` (según cómo gestione el proyecto) para instalar dependencias.
- Si no entiendes una función, busca su definición en el proyecto (por ejemplo, abre `src/models/User.js`).
- Prueba en un entorno local con una copia de la base de datos o con datos de prueba.

---

## Mini-contrato (inputs/outputs y errores esperados)

- Inputs principales:
  - `userId` (string), `refreshToken` (string)
- Outputs principales:
  - Objetos con `{ accessToken, refreshToken, expiresIn, refreshExpiresIn }` o `true/false` para revocar.
- Errores comunes:
  - Tokens malformados, expirados, usuario inactivo o secretos faltantes.

---

## Qué hice y siguientes pasos

- Creé este archivo explicativo para principiantes en `docs/tokens/tokenService-for-beginners.md`.

Siguientes pasos recomendados:

- Abrir `src/models/User.js` y leer cómo guarda `refreshTokens` para entender la persistencia.
- Probar los ejemplos en local con un usuario de prueba.

---

Si quieres, puedo:

- Añadir ejemplos de scripts listos (con conexión a la BD) para que ejecutes `node ...` directamente.
- Explicar cómo integrar esto con un middleware de Express para proteger rutas.

Fin del documento.
