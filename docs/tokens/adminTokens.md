## Archivo: src/routes/adminTokens.js

Propósito

- Endpoints para administradores para inspeccionar, limpiar y revocar tokens de usuarios.

Endpoints principales

- POST `/api/admin/tokens/cleanup` -> Ejecuta limpieza manual (requiere admin).
- GET `/api/admin/tokens/health` -> Estado de salud del sistema de tokens.
- GET `/api/admin/tokens/statistics` -> Estadísticas de tokens.
- GET `/api/admin/tokens/user/:userId` -> Información detallada de tokens de un usuario.
- POST `/api/admin/tokens/revoke/:userId` -> Revoca todos los tokens de un usuario.

Contenido

```javascript
/* Contenido completo: ver src/routes/adminTokens.js */
```
