## Archivo: src/middleware/authMiddleware.js

Propósito

- Middleware que valida access tokens y enriquece `req.user` con información del usuario

Funciones exportadas

- `authenticateToken` -> middleware principal que requiere token válido; usa `TokenService.validateAccessToken`.
- `requireRole(requiredRoles)` -> middleware que verifica roles.
- `optionalAuth` -> no falla si no hay token; intenta autenticar si hay uno.

Comportamiento de errores

- Maneja `JsonWebTokenError`, `TokenExpiredError` y `NotBeforeError` devolviendo 401 con códigos y mensajes específicos.

Contenido

```javascript
/* Contenido completo: ver src/middleware/authMiddleware.js */
```
