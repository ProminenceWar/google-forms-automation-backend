## Archivo: src/models/User.js

Propósito

- Esquema de usuarios con almacenamiento interno de `refreshTokens` y métodos utilitarios para manejar tokens y logins.

Campos relevantes

- `refreshTokens` -> array de objetos { token, createdAt, expiresAt }

Métodos de instancia importantes

- `addRefreshToken(token, expiresAt)` -> añade un refresh token y mantiene solo los últimos 5.
- `removeRefreshToken(token)` -> elimina un refresh token específico.
- `cleanExpiredTokens()` -> elimina tokens expirados.

Métodos estáticos

- `findByCredentials(email, password)` -> busca usuario y valida contraseña (usado para login).

Contenido completo

```javascript
/* Contenido completo: ver src/models/User.js */
```
