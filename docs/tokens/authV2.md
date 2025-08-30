## Archivo: src/routes/authV2.js

Propósito

- Rutas públicas y protegidas relacionadas con autenticación: login, refresh, logout, logout-all, token-info y me.

Funciones / Endpoints principales

- POST `/api/auth/login` -> maneja login, valida credenciales y llama a `TokenService.generateTokenPair`.
- POST `/api/auth/refresh` -> valida el cuerpo y llama a `TokenService.refreshAccessToken`.
- POST `/api/auth/logout` -> revoca un refresh token específico usando `TokenService.revokeRefreshToken` (requiere `authenticateToken`).
- POST `/api/auth/logout-all` -> revoca todos los refresh tokens del usuario con `TokenService.revokeAllRefreshTokens`.
- GET `/api/auth/token-info` -> obtiene info de tokens con `TokenService.getTokenInfo` (requiere `authenticateToken`).
- GET `/api/auth/me` -> devuelve información del usuario autenticado.

Detalles importantes

- Usa `express-rate-limit` para mitigar abusos en login y refresh.
- Valida entrada con `express-validator`.
- Traduce errores de `TokenService` a códigos HTTP y mensajes controlados.

Contenido completo

```javascript
/* Contenido completo del archivo src/routes/authV2.js */
// (Ver `src/routes/authV2.js` en el repositorio para el código exacto)
```
