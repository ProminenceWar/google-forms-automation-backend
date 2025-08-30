# JWT: Algoritmos de firma (HS vs RS/ES) — Explicación detallada

Este documento profundiza en los algoritmos de firma usados con JWT: HMAC (HS*), RSA (RS*) y ECDSA (ES\*). Está escrito para alguien que necesita entender cómo funcionan, cuándo usarlos, riesgos, rotación de claves, ejemplos en Node.js y comandos para generar claves.

## Qué encontrarás aquí

- Idea clave: simétrico vs asimétrico
- Cómo funciona HMAC (HS256/HS512)
- Cómo funciona RSA (RS256) y ECDSA (ES256)
- Ventajas / desventajas y casos de uso
- Ataques comunes y mitigaciones (alg:none, confusión de alg)
- Rotación de claves y `kid` / JWKS
- Ejemplos prácticos en Node.js (firmar/verificar)
- Comandos OpenSSL (PowerShell/Windows compatibles)
- Guía rápida para decidir

---

## 1) Idea simple: simétrico vs asimétrico

- Simétrico: la misma clave (secreto) se usa para firmar y para verificar. Ejemplo: HS256 (HMAC-SHA256).
- Asimétrico: existe una clave privada (que firma) y una clave pública (que verifica). Ejemplo: RS256 (RSA) o ES256 (ECDSA).

Consecuencia práctica:

- Con HS, quien verifica tiene la capacidad de firmar (porque conoce el secreto).
- Con RS/ES, puedes distribuir la clave pública a validadores sin darles la capacidad de firmar.

---

## 2) HMAC (HS256, HS384, HS512)

Cómo funciona (en una línea):

- Se calcula HMAC(secret, base64url(header) + '.' + base64url(payload)). El resultado se codifica en base64url y es la firma.

Pros:

- Rápido y sencillo de implementar.
- Tamaño de firma relativamente pequeño.
- Bueno para sistemas monolíticos o cuando solo un servicio firma y verifica.

Contras:

- El secreto debe compartirse con cualquier verificador: si se lo das a muchos servicios, cualquiera puede emitir tokens válidos.
- Rotación de secreto puede ser más compleja: debes actualizar secret en todos los verificadores simultáneamente o usar versión/strategia de rollout.

Ejemplo en Node.js (HS256):

```javascript
const jwt = require("jsonwebtoken");
const secret = process.env.ACCESS_SECRET || "dev_secret";

// firmar
const token = jwt.sign({ sub: "user1", role: "user" }, secret, {
  algorithm: "HS256",
  expiresIn: "1h",
});

// verificar (especificando algoritmo permitido)
const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
```

Recomendación HS:

- Úsalo si tu aplicación es un único proceso o si todos los servicios que tienen el secret están autorizados a emitir tokens.
- Nunca colocar secret en repositorios; usar variables de entorno o secret managers.

---

## 3) RSA (RS256, RS384, RS512)

Cómo funciona:

- Se firma con una clave privada RSA (p.ej. RSA-SHA256) y se verifica con la clave pública correspondiente.

Pros:

- Puedes distribuir la clave pública ampliamente sin riesgo de que otros emitan tokens.
- Ideal para arquitecturas donde muchos servicios sólo verifican (p. ej. microservicios, CDN, apigateway).
- Facilita integraciones con terceros y SSO.

Contras:

- Operaciones criptográficas más costosas que HMAC (aunque aún prácticas para la mayoría de APIs).
- Requiere manejo de pares de claves y rotación.
- Firma más grande (mayor tamaño de token) que ECDSA para seguridad equivalente.

Generar claves (OpenSSL):

```powershell
# RSA 2048 (Windows PowerShell)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -in private.pem -pubout -out public.pem
```

Ejemplo en Node.js (RS256):

```javascript
const fs = require("fs");
const jwt = require("jsonwebtoken");
const privateKey = fs.readFileSync("./keys/private.pem", "utf8");
const publicKey = fs.readFileSync("./keys/public.pem", "utf8");

const token = jwt.sign({ sub: "user1" }, privateKey, {
  algorithm: "RS256",
  expiresIn: "1h",
  keyid: "key-2025-08",
});
const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

Recomendación RS:

- Recomendado para servicios distribuidos y cuando no quieres que verificadores puedan firmar.
- Combina bien con JWKS (JSON Web Key Set) para publicar claves públicas dinámicamente.

---

## 4) ECDSA (ES256, ES384, ES512)

Cómo funciona:

- Usa curvas elípticas (p. ej. P-256 para ES256). Firma y verificación con claves EC.

Pros:

- Tamaño de clave y firma más pequeño que RSA para la misma seguridad.
- Buena opción cuando la longitud del token/overhead importa.

Contras:

- Implementación y manejo puede ser más delicado (formatos de firma r/s, interoperabilidad según librerías).

Generar claves EC (OpenSSL):

```powershell
openssl ecparam -name prime256v1 -genkey -noout -out ec_private.pem
openssl ec -in ec_private.pem -pubout -out ec_public.pem
```

Uso en Node.js es similar a RS, con `algorithm: 'ES256'`.

---

## 5) PS\* (RSA-PSS) y otros

- PS256/PS384/PS512 usan RSA-PSS (un esquema probabilístico más seguro que RSA-PKCS#1 v1.5 para firmas). Buenas opciones si tu biblioteca y clientes lo soportan.

---

## 6) Ataques y malas configuraciones comunes

1. alg: "none"

   - Descripción: token sin firma.
   - Riesgo: aceptarlo equivale a aceptar tokens sin verificación.
   - Mitigación: no aceptar `alg: 'none'` y usar librerías que exijan verificación.

2. Confusión de algoritmo (alg confusion)

   - Descripción: atacante cambia el `alg` en el header a HS cuando el servidor espera RS, y reusa la clave pública como HMAC secret si el servidor no valida la lista de algoritmos.
   - Mitigación: al verificar, siempre especifica `algorithms: ['RS256']` (o la lista esperada) y no uses la clave pública como secreto.

3. Fuga de claves HMAC

   - Riesgo: si el secret HS se filtra, cualquiera puede firmar tokens.
   - Mitigación: limitar exposición del secret y preferir asimétrico para verificadores no autorizados a firmar.

4. Reuse de claves antiguas
   - Mitigación: rotación controlada, revoke, mantener grace period.

---

## 7) Rotación de claves y `kid` / JWKS

- `kid` (Key ID) va en el header y ayuda a identificar qué clave usar para verificar el token.
- JWKS (JSON Web Key Set): endpoint JSON público que devuelve claves públicas con sus `kid`.

Flujo de rotación recomendado:

1. Generas nuevo par de claves y `kid` nuevo.
2. Publicas la clave pública nueva en el JWKS y empiezas a emitir tokens firmados con la privada nueva (header `kid` = nuevo kid).
3. Mantén las claves antiguas en el JWKS durante el tiempo máximo de expiración de tokens antiguos (grace period).
4. Después del grace period, retira las claves antiguas del JWKS.

Ventajas:

- Verificadores pueden obtener la clave correcta por `kid` y no necesitas desplegar la clave pública manualmente a cada verificador.

Herramientas/librerías útiles:

- `jwks-rsa` (Node) para resolver `kid` automáticamente.

---

## 8) Cómo verificar correctamente (jsonwebtokeN ejemplo)

- Al verificar un token, provee la clave pública (o secret) y explícita la lista de algoritmos permitidos.

HS256 example:

```javascript
jwt.verify(token, secret, { algorithms: ["HS256"] });
```

RS256 example:

```javascript
jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

Si usas JWKS, usarás una callback/función que resuelva `kid` a la clave pública y luego llamarás a `jwt.verify`.

---

## 9) Performance y tamaño

- HS signatures: computación ligera, muy rápida.
- RS signatures: más lenta que HS, pero todavía adecuada para la mayoría de APIs.
- ES signatures: compacto y eficiente; a veces más rápido que RSA para verificación.
- Tamaño de token: RS firma suele ser más grande que ES para la misma seguridad.

---

## 10) Guía rápida para decidir

- Sistema monolítico, único emisor/verificador: HS256 puede ser suficiente.
- Sistema distribuido con muchos verificadores: RS256 o ES256 + JWKS + kid.
- Necesitas tokens lo más cortos posible (mobile/IoT): considerar ES256.
- Planeas integrar terceros que validarán tokens: RS/ES es la elección correcta.

---

## 11) Ejemplos operativos y comandos (PowerShell compatibles)

Generar RSA 2048:

```powershell
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ./keys/private.pem
openssl rsa -in ./keys/private.pem -pubout -out ./keys/public.pem
```

Generar EC P-256 (ES256):

```powershell
openssl ecparam -name prime256v1 -genkey -noout -out ./keys/ec_private.pem
openssl ec -in ./keys/ec_private.pem -pubout -out ./keys/ec_public.pem
```

Probar firma/verificación local (Node.js):

```javascript
// examples/sign-verify-rs256.js
const fs = require("fs");
const jwt = require("jsonwebtoken");
const priv = fs.readFileSync("./keys/private.pem", "utf8");
const pub = fs.readFileSync("./keys/public.pem", "utf8");
const token = jwt.sign({ sub: "u1" }, priv, {
  algorithm: "RS256",
  expiresIn: "1h",
});
console.log("token:", token);
console.log("decoded:", jwt.verify(token, pub, { algorithms: ["RS256"] }));
```

---

## 12) Lista de buenas prácticas

- Nunca aceptar `alg: 'none'`.
- Al verificar, siempre especifica `algorithms: [...]` esperados.
- No usar la clave pública como secreto HMAC por error.
- Mantener secretos fuera del código (env vars, vaults).
- Implementar `kid` + JWKS para rotación y escalado.
- Rotar claves periódicamente y mantener grace periods.
- Loggear intentos de verificación fallidos y monitorizar.

---

## 13) Resumen

- HS (simétrico) es simple y rápido, pero comparte la capacidad de firmar con quien tenga el secret.
- RS/ES (asimétrico) separa firma y verificación: mejor para sistemas distribuidos, SSO y terceros.
- Usa `kid` + JWKS para escalar y rotar claves, y siempre verifica tokens con la lista de algoritmos permitidos.

---

## 14) ¿Quieres que lo ponga en práctica?

Puedo generar archivos de ejemplo en el repo:

- `scripts/gen-keys.ps1` (genera claves RSA/EC)
- `examples/sign-verify-rs256.js`
- `examples/sign-verify-hs256.js`
- `examples/jwks-server.js` (pequeño servidor JWKS para pruebas)

¿Quieres que cree alguno(s) de estos archivos ahora?
