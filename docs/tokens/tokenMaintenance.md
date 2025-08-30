## Archivo: src/middleware/tokenMaintenance.js

Propósito

- Tareas programadas y endpoints administrativos para limpiar tokens expirados y generar estadísticas.

Funciones / Métodos

- `TokenMaintenanceMiddleware.init()` -> inicia jobs cron para limpieza horaria y cada 6 horas.
- `TokenMaintenanceMiddleware.logTokenStatistics()` -> genera estadísticas agregadas.
- `TokenMaintenanceMiddleware.manualCleanup(req, res, next)` -> middleware para limpieza manual vía endpoint admin.
- `TokenMaintenanceMiddleware.healthCheck(req, res, next)` -> verifica salud de DB y `TokenService`.

Contenido

```javascript
/* Contenido completo: ver src/middleware/tokenMaintenance.js */
```
