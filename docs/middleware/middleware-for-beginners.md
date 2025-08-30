# Middleware — Explicado para un novato completo

Este documento explica, paso a paso y con ejemplos sencillos, qué es un _middleware_ en Node.js/Express y cómo usarlo en tus proyectos. Está pensado para alguien que nunca trabajó con middlewares.

## Breve plan

- Qué es un middleware y por qué existe
- Firma y tipos de middleware en Express
- Orden y encadenamiento (por qué importa)
- Ejemplos prácticos: logger, autenticación, parseo, manejo de errores
- Cómo escribir middleware asíncrono y buenas prácticas
- Cómo montar y reutilizar middleware
- Depuración, pruebas y checklist rápido

---

## ¿Qué es un middleware?

Un _middleware_ es una función que intercepta las peticiones HTTP entre el cliente y la ruta final. Puede leer o modificar la petición (`req`) y la respuesta (`res`), detener la cadena (respondiendo al cliente) o delegar al siguiente middleware llamando a `next()`.

Piensa en middleware como estaciones en una línea de montaje: cada estación puede inspeccionar, transformar o detener el paquete.

---

## Firma (forma) de un middleware en Express

La forma más común:

```javascript
function miMiddleware(req, res, next) {
  // hacer algo
  next(); // pasar al siguiente
}
```

Para errores (error-handling middleware) la firma es distinta (4 argumentos):

```javascript
function errorHandler(err, req, res, next) {
  // manejar error
}
```

---

## Tipos de middleware

- Middleware de aplicación: `app.use(...)` — se aplica globalmente a la app.
- Middleware de ruta/Router: `router.use(...)` o usarlo en rutas específicas `app.get('/api', middleware, handler)`.
- Middleware incorporado: como `express.json()` que parsea JSON.
- Middleware de terceros: p.ej. `cors`, `helmet`, `morgan`.
- Error-handling middleware: captura errores pasados con `next(err)`.

---

## Orden y encadenamiento

El orden en que defines `app.use()` y `app.get()` importa: Express ejecuta middlewares en el orden en que fueron montados. Si un middleware no llama a `next()` ni responde, la petición quedará colgada.

Ejemplo de orden:

1. Middleware de seguridad (helmet, CORS)
2. Parseadores (express.json())
3. Logger
4. Autenticación/Autorización
5. Rutas
6. Error handler

---

## Ejemplos prácticos

1. Logger simple

```javascript
function logger(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
}
app.use(logger);
```

2. Middleware de autenticación usando `tokenService.validateAccessToken`

```javascript
const TokenService = require("../src/services/tokenService");

async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "No token" });

    const token = auth.split(" ")[1];
    const payload = await TokenService.validateAccessToken(token); // lanza si inválido

    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    next(err); // lo pasamos al error handler
  }
}

app.use("/api/protected", authMiddleware, protectedRouter);
```

3. Error handler

```javascript
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
}
app.use(errorHandler);
```

---

## Middleware asíncrono y manejo de errores

- Si usas `async` en middleware, atrapa errores y pásalos a `next(err)` o usa un wrapper:

```javascript
function wrapAsync(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Uso:
app.get(
  "/ruta",
  wrapAsync(async (req, res) => {
    const data = await something();
    res.json(data);
  })
);
```

Esto evita tener que poner `try/catch` en cada middleware async.

---

## Cómo montar middleware en rutas y routers

- Global (todas las rutas): `app.use(logger)`
- Prefijo: `app.use('/api', apiRouter)` y dentro del router `router.use(auth)`
- Ruta individual: `app.get('/user', auth, handler)`

Reutiliza middleware colocándolo en routers y exportándolo como módulo.

---

## Buenas prácticas

- Mantener middlewares pequeños y con responsabilidad única.
- No responder desde middleware si su responsabilidad es validación; devolver errores y dejar que el error handler formatee la respuesta.
- Usar `wrapAsync` para manejar promesas.
- Evitar bloqueos de CPU en middleware (hacer tareas pesadas en background o procesos separados).
- Registrar información mínima (no incluir datos sensibles en logs).

---

## Depuración y pruebas

- Para depurar: `console.log`, `debug` o herramientas como `node --inspect` y breakpoints.
- Tests: escribe pruebas unitarias simulando `req`, `res` y `next` (p. ej. con Jest y objetos mock).

Ejemplo de test simple (pseudocódigo):

```javascript
const req = { method: "GET", url: "/x", headers: {} };
const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
const next = jest.fn();
logger(req, res, next);
expect(next).toHaveBeenCalled();
```

---

## Errores comunes

- No llamar a `next()` ni responder => petición colgada.
- Llamar a `next()` después de haber enviado respuesta => errores/confusión.
- No manejar errores en middleware `async` => promesas rechazadas sin handler.

---

## Checklist rápido (para aplicar a tu proyecto)

- [ ] Usar `express.json()` antes de leer `req.body`.
- [ ] Registrar requests (logger) en entorno no productivo o con muestreos en prod.
- [ ] Proteger rutas con un middleware de autenticación.
- [ ] Tener un error handler final (4 args).
- [ ] Envolver middlewares asíncronos con `wrapAsync`.
- [ ] No loggear secretos ni tokens completos.

---

## Siguientes pasos prácticos

- Agregar `docs/middleware/middleware-for-beginners.md` al repo (este archivo).
- Puedo crear un archivo de ejemplo en `src/middleware/authMiddleware.js` y tests unitarios para él.

Si quieres, creo el middleware de autenticación real usando `TokenService` y un test rápido. ¿Lo genero en el proyecto?
