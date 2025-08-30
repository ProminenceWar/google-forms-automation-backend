# Curso intensivo: JWT de 0 a 100

Esta guía es un curso intensivo y práctico sobre JSON Web Tokens (JWT). Está pensada para llevarte desde conceptos básicos hasta patrones y prácticas de producción, con ejemplos en Node.js. Lee con calma y prueba los ejemplos en tu entorno.

## Breve plan del curso

- Qué es un JWT y para qué se usa
- Estructura y decodificación
- Algoritmos de firma: simétricos vs asimétricos
- Claims estándar y personalizados
- Expiración, iat, nbf y revocación
- Access tokens vs refresh tokens: patrones y ejemplo completo
- Implementación en Node.js con `jsonwebtoken` y `crypto`
- Middleware de Express para validar JWT
- Seguridad: almacenamiento, ataques, mitigaciones
- Rotación, revocación y listas negras
- Pruebas, debugging y herramientas útiles
- Checklist de producción

---

## 1. ¿Qué es un JWT y para qué sirve?

JWT (JSON Web Token) es un estándar (RFC 7519) para transmitir información (claims) de forma compacta y segura entre dos partes como un objeto JSON firmado (y opcionalmente cifrado).

Usos típicos:

- Autenticación: representar la identidad del usuario (token de acceso).
- Autorización: llevar roles o permisos en el payload.
- Intercambio de información entre servicios de confianza.

Beneficio clave: el receptor puede verificar la firma y confiar en los claims sin consultar la fuente original en cada petición (siempre que se use una firma válida y clave segura).

---

## 2. Estructura de un JWT

Un JWT tiene 3 partes separadas por puntos: header.payload.signature

- Header (JSON):metadata, p.ej. algoritmo y tipo.
- Payload (JSON): claims (datos). No es secreto por defecto.
- Signature: firma resultante de aplicar un algoritmo sobre header + payload con una clave.

Ejemplo (decodificado):

Header:

```json
{ "alg": "HS256", "typ": "JWT" }
```

Payload:

```json
{
  "sub": "user123",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1690000000,
  "exp": 1690003600
}
```

Token (ejemplo ficticio):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjkwMDAwMDAwLCJleHAiOjE2OTAwMDM2MDB9.somesignature
```

Nota: header y payload están codificados en base64url (no es base64 normal). La firma protege la integridad del header+payload.

---

## 3. Algoritmos de firma: HS vs RS/ES

- HS256, HS512 (HMAC + SHA): simétricos, comparten la misma clave para firmar y verificar.
  - Pros: más sencillo, más rápido.
  - Contras: la clave debe permanecer secreta en todos los verificadores. Si un servicio puede firmar, puede emitir tokens válidos.
- RS256, ES256 (RSA/ECDSA): asimétricos, usan clave privada para firmar y clave pública para verificar.
  - Pros: puedes distribuir la clave pública a quien verifique sin exponer la privada; ideal para microservicios y SSO.
  - Contras: manejo de pares de claves, más lento que HMAC.

Recomendación:

- Para APIs y sistemas distribuidos, favorece RSA/ECDSA con rotación de claves (kid header).
- Para un servicio monolítico, HS puede ser suficiente si la clave está bien protegida.

---

## 4. Claims comunes (estándar) y personalizados

Claims estándar (recomendados):

- iss: issuer (quién emite el token)
- sub: subject (ID del usuario)
- aud: audience (quién debe aceptar el token)
- exp: expiration time (timestamp)
- nbf: not before (no válido antes de...)
- iat: issued at
- jti: JWT ID (identificador único del token)

Claims personalizados: p.ej. role, scope, company. Evita poner datos sensibles (contraseñas, PII no necesario). Recuerda que el payload no está cifrado por defecto.

---

## 5. Expiración, iat y nbf

- exp: define cuándo expira el token. Es la principal defensa contra uso prolongado.
- iat: marca cuándo fue creado; útil para invalidar tokens emitidos antes de un evento (ej. cambio de contraseña).
- nbf: útil para emitir tokens que empiezan a ser válidos más adelante.

Evita tokens sin `exp` en producción.

---

## 6. Access token vs Refresh token (patrón recomendado)

- Access token: duración corta (1h, 15m), se usa en cada petición.
- Refresh token: duración larga (días/meses), se usa solo para pedir nuevos access tokens.

Por qué usar ambos:

- Minimiza exposición de permisos a largo plazo.
- Permite revocación y control sobre sesiones (aluarda refresh tokens en BD o store manejable).

Patrones de almacenamiento:

- Guardar refresh token en BD por usuario → permite revocación, listados y rotación.
- Guardar refresh token en cookie httpOnly Secure SameSite en browsers.
- Mantener access token en memoria (no persistente) en clientes SPA para reducir riesgo XSS.

Rotación de refresh tokens (recomendado):

- Cuando un refresh token se usa, revoca el token viejo y emite uno nuevo (mitiga replay attacks).

---

## 7. Estrategias de revocación

1. Estado en servidor (lista blanca): almacenar los refresh tokens (o jti) en BD. Verificar existencia al usar.
2. Lista negra (blacklist): almacenar jti de access tokens que se revocaron antes de exp.
3. Short-lived access tokens con long-lived refresh tokens + rotate+revoke: más seguro y escalable.

Trade-offs:

- Lista negra para access tokens requiere lookup por petición (compromete "statelessness").
- Guardar refresh tokens en BD es recomendable y económico (menos tráfico que verificar cada access token).

---

## 8. Implementación práctica en Node.js (ejemplos)

A continuación ejemplos mínimos usando `jsonwebtoken` y `crypto`.

Instalación (si falta):

```powershell
npm install jsonwebtoken
# o pnpm add jsonwebtoken
```

Generar par de tokens (access + refresh):

```javascript
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_SECRET = process.env.ACCESS_SECRET || "dev_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "dev_refresh_secret";

function generateTokens(user) {
  const accessPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(accessPayload, ACCESS_SECRET, {
    expiresIn: "1h",
  });

  const tokenId = crypto.randomUUID();
  const refreshPayload = { sub: user.id, tokenId, type: "refresh" };
  const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, {
    expiresIn: "30d",
  });

  // Guarda refreshToken/tokenId en la BD asociado al usuario
  return { accessToken, refreshToken };
}
```

Verificar token (access o refresh):

```javascript
try {
  const decoded = jwt.verify(token, ACCESS_SECRET);
  // usar decoded.sub, decoded.role, etc.
} catch (err) {
  // TokenExpiredError, JsonWebTokenError, NotBeforeError
}
```

Rotación simple de refresh tokens:

```javascript
async function refreshAccess(refreshToken) {
  const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  const userId = decoded.sub;
  const tokenId = decoded.tokenId;

  // 1) Verificar en la BD que tokenId está activo para userId
  // 2) Si existe: eliminar tokenId (revocar) y emitir nuevos tokens
  // 3) Si no existe: posible compromiso. Revocar todos los refresh tokens del usuario.
}
```

---

## 9. Middleware de Express para proteger rutas

```javascript
// authMiddleware.js
const jwt = require("jsonwebtoken");
const ACCESS_SECRET = process.env.ACCESS_SECRET;

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "No token" });

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};
```

Uso:

```javascript
const auth = require("./authMiddleware");
app.get("/api/protected", auth, (req, res) => {
  res.json({ hello: "world", user: req.user });
});
```

---

## 10. Seguridad y almacenamiento (prácticas recomendadas)

- Nunca pongas secretos en el código fuente. Usa variables de entorno o sistemas secretos.
- Access tokens: corta vida, preferible en memoria del cliente.
- Refresh tokens: guardarlos en cookie httpOnly + Secure + SameSite en aplicaciones web.
- Mobile apps: almacenar refresh tokens en keystore / secure storage.
- Evita poner información sensible en el payload.
- Usa TLS (HTTPS) siempre.
- Firma asimétrica (RS256/ES256) para servicios distribuidos.
- Rotación de claves: plan para reemplazar claves y soportar `kid` en header.

Mitigaciones a ataques comunes:

- XSS: evita LocalStorage para tokens; valida y escapa outputs.
- CSRF: usar cookies con SameSite=strict, o enviar tokens por header (X-CSRF-Token).
- Replay: rotación y check de jti/tokenId con BD.

---

## 11. Rotación y detección de compromiso (pattern)

1. Cliente solicita acceso con refresh token.
2. Servidor verifica refresh token y tokenId en BD.
3. Servidor emite nuevo accessToken y nuevo refreshToken con nuevo tokenId.
4. Servidor elimina el tokenId viejo (revoca).

Si el cliente intenta reutilizar el token viejo, detectas replay y puedes revocar todos los refresh tokens del usuario.

---

## 12. Pruebas y debugging

Herramientas útiles:

- jwt.io Debugger: decodifica y visualiza header/payload (no verifique firmas offline).
- `jsonwebtoken` errores: TokenExpiredError, JsonWebTokenError, NotBeforeError — maneja cada uno.

Tests básicos:

- Generar token y verificar con la misma clave.
- Verificar token con clave incorrecta → JsonWebTokenError.
- Verificar token expirado → TokenExpiredError.
- Simular reuse de refresh token y comprobar que el sistema rechaza el segundo uso.

---

## 13. Checklist de producción

- [ ] Secrets en vault o variables de entorno
- [ ] Access tokens cortos (ej. 15m–1h)
- [ ] Refresh tokens guardados en BD y rotados
- [ ] Cookies httpOnly Secure SameSite para web
- [ ] Uso de RS/ES para verificadores públicos (si aplica)
- [ ] Plan de rotación de claves y soporte `kid`
- [ ] Monitoreo de intentos fallidos de refresh
- [ ] Políticas claras de revocación (cambio de clave, cambio de contraseña)

---

## 14. Preguntas frecuentes rápidas

Q: ¿Puedo usar solo access tokens? R: Sí, pero sin refresh tokens los usuarios necesitarán volver a autenticarse más seguido; si haces access tokens muy largos, aumentas el riesgo.

Q: ¿Debo cifrar el payload? R: Si necesitas confidencialidad, considera JWE (JSON Web Encryption) o guarda menos datos en el payload y consulta el servidor.

Q: ¿Cómo invalidar todos los access tokens inmediatamente? R: Mantén un campo `tokensInvalidBefore` en el usuario (timestamp). Al verificar token, compara `iat` >= `tokensInvalidBefore`.

---

## 15. Recursos y lecturas recomendadas

- RFC 7519 (JWT) — especificación
- jwt.io — herramientas y librerías
- Documentación de `jsonwebtoken` (npm)

---

## 16. Siguientes pasos prácticos (qué puedes hacer ahora)

- Implementa el flujo `generateTokenPair` y `refreshAccessToken` en un entorno de prueba.
- Añade middleware de Express y una ruta protegida para practicar.
- Simula ataques (token reuse, token expiry) y observa los logs.

---

Si quieres, puedo:

- Crear scripts listos para ejecutar (generar/verificar/refresh) que se integren con el `User` model del repo.
- Implementar un middleware de ejemplo y tests unitarios para `tokenService`.

Fin del curso intensivo.
