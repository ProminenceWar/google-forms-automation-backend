# API Endpoints - Google Forms Automation Backend

## 📋 Tabla de Contenidos

- [Información General](#información-general)
- [Autenticación](#autenticación)
- [Formularios FSO](#formularios-fso)
- [Gestión de Archivos](#gestión-de-archivos)
- [Procesamiento de PDFs](#procesamiento-de-pdfs)
- [Administración de Datos](#administración-de-datos)
- [Tipos de Datos](#tipos-de-datos)
- [Códigos de Error](#códigos-de-error)

---

## 🌐 Información General

### Base URL

```
https://api.google-forms-automation.com/v1
```

### Headers Requeridos

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}",
  "X-API-Version": "1.0"
}
```

### Formato de Respuesta Estándar

```json
{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "timestamp": "ISO 8601 string",
  "requestId": "unique_identifier"
}
```

---

## 🔐 Autenticación

### 1. Login de Usuario

**POST** `/auth/login`

**Descripción**: Autentica un usuario y retorna un token JWT.

**Request Body**:

```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "tecnico | supervisor | admin",
      "company": "string"
    },
    "token": "JWT_token_string",
    "expiresIn": 3600
  },
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123456"
}
```

**Errores**:

- 401: Credenciales inválidas
- 400: Datos de entrada inválidos

### 2. Refresh Token

**POST** `/auth/refresh`

**Descripción**: Renueva el token de autenticación.

**Request Body**:

```json
{
  "refreshToken": "string (required)"
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Token renovado exitosamente",
  "data": {
    "token": "new_JWT_token_string",
    "expiresIn": 3600
  },
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123457"
}
```

### 3. Logout

**POST** `/auth/logout`

**Descripción**: Invalida el token actual del usuario.

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Logout exitoso",
  "data": null,
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123458"
}
```

---

## 📋 Formularios FSO

### 1. Crear Formulario FSO

**POST** `/forms/fso`

**Descripción**: Crea un nuevo formulario FSO con toda la información de inspección.

**Request Body**:

```json
{
  "email": "string (required)",
  "numeroOrden": "string (required)",
  "tipoFSO": "string (required)",
  "companiaInspeccion": "string (required)",
  "nombreTecnico": "string (required)",
  "instalacionDireccionCorrecta": boolean,
  "combaFTB": boolean,
  "colocacionGripCorrecta": boolean,
  "alturaDropCorrecta": boolean,
  "puntoApoyoAdecuado": boolean,
  "dropLibreEmpalme": boolean,
  "metrosDrop": "string (required)",
  "colocacionGanchosCorrecta": boolean,
  "recorridoDropExteriorAdecuado": boolean,
  "colocacionTestTerminalCorrecta": boolean,
  "jackSuperficieCorrecto": boolean,
  "routerUbicadoCorrectamente": boolean,
  "potenciaCorrecta": "string (required)",
  "puntuacionCliente": "string (required)",
  "telefonoCliente": "number (required)",
  "nombreCliente": "string (required)",
  "comentariosCaso": "string (optional)",
  "ubicacion": {
    "latitude": "number (optional)",
    "longitude": "number (optional)",
    "direccion": "string (optional)"
  }
}
```

**Procesamiento del Backend**:

1. Validar todos los campos requeridos
2. Validar formato de email y teléfono
3. Generar ID único para el formulario
4. Crear timestamp de creación
5. Calcular puntuación automática basada en campos boolean
6. Guardar en base de datos
7. Enviar notificación al supervisor (si aplica)
8. Generar reporte en PDF (proceso asíncrono)

**Response Success (201)**:

```json
{
  "success": true,
  "message": "Formulario FSO creado exitosamente",
  "data": {
    "id": "fso_1724064600_abc123",
    "numeroOrden": "ORD-2025-001",
    "estado": "completado",
    "fechaCreacion": "2025-08-19T10:30:00Z",
    "puntuacionCalculada": 8.5,
    "reportePdfUrl": "https://storage.example.com/reports/fso_1724064600_abc123.pdf"
  },
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123459"
}
```

**Errores**:

- 400: Datos de entrada inválidos
- 409: Número de orden ya existe
- 422: Error de validación de campos

### 2. Obtener Lista de Formularios FSO

**GET** `/forms/fso`

**Descripción**: Obtiene la lista paginada de formularios FSO con filtros opcionales.

**Query Parameters**:

- `page`: número de página (default: 1)
- `limit`: elementos por página (default: 20, max: 100)
- `estado`: filtro por estado (`pendiente`, `completado`, `revisado`)
- `fechaInicio`: fecha inicio (ISO 8601)
- `fechaFin`: fecha fin (ISO 8601)
- `tecnico`: filtro por nombre de técnico
- `companiaInspeccion`: filtro por compañía
- `search`: búsqueda por número de orden o cliente

**Procesamiento del Backend**:

1. Validar parámetros de consulta
2. Aplicar filtros solicitados
3. Implementar paginación
4. Ordenar por fecha de creación (más recientes primero)
5. Retornar datos con metadatos de paginación

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Lista de formularios FSO obtenida exitosamente",
  "data": {
    "formularios": [
      {
        "id": "fso_1724064600_abc123",
        "numeroOrden": "ORD-2025-001",
        "tipoFSO": "Instalación Fibra",
        "nombreCliente": "Juan Pérez",
        "nombreTecnico": "Carlos López",
        "companiaInspeccion": "TechInstall Corp",
        "estado": "completado",
        "puntuacionCliente": "9",
        "puntuacionCalculada": 8.5,
        "fechaCreacion": "2025-08-19T10:30:00Z",
        "fechaActualizacion": "2025-08-19T11:15:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 89,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123460"
}
```

### 3. Obtener Formulario FSO por ID

**GET** `/forms/fso/{id}`

**Descripción**: Obtiene los detalles completos de un formulario FSO específico.

**Path Parameters**:

- `id`: ID único del formulario FSO

**Procesamiento del Backend**:

1. Validar formato del ID
2. Buscar formulario en base de datos
3. Incluir historial de cambios si existe
4. Generar URLs firmadas para archivos adjuntos
5. Calcular métricas adicionales

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Formulario FSO obtenido exitosamente",
  "data": {
    "id": "fso_1724064600_abc123",
    "email": "tecnico@example.com",
    "numeroOrden": "ORD-2025-001",
    "tipoFSO": "Instalación Fibra",
    "companiaInspeccion": "TechInstall Corp",
    "nombreTecnico": "Carlos López",
    "instalacionDireccionCorrecta": true,
    "combaFTB": true,
    "colocacionGripCorrecta": false,
    "alturaDropCorrecta": true,
    "puntoApoyoAdecuado": true,
    "dropLibreEmpalme": true,
    "metrosDrop": "25",
    "colocacionGanchosCorrecta": true,
    "recorridoDropExteriorAdecuado": true,
    "colocacionTestTerminalCorrecta": true,
    "jackSuperficieCorrecto": true,
    "routerUbicadoCorrectamente": true,
    "potenciaCorrecta": "-15 dBm",
    "puntuacionCliente": "9",
    "telefonoCliente": 1234567890,
    "nombreCliente": "Juan Pérez",
    "comentariosCaso": "Instalación completada sin inconvenientes",
    "ubicacion": {
      "latitude": 40.7128,
      "longitude": -74.006,
      "direccion": "123 Main St, City, State"
    },
    "fechaCreacion": "2025-08-19T10:30:00Z",
    "fechaActualizacion": "2025-08-19T11:15:00Z",
    "estado": "completado",
    "puntuacionCalculada": 8.5,
    "archivosAdjuntos": [
      {
        "id": "file_123",
        "nombre": "reporte_instalacion.pdf",
        "tipo": "application/pdf",
        "tamaño": 1024000,
        "url": "https://storage.example.com/files/file_123.pdf"
      }
    ],
    "historial": [
      {
        "accion": "creado",
        "fecha": "2025-08-19T10:30:00Z",
        "usuario": "Carlos López"
      },
      {
        "accion": "completado",
        "fecha": "2025-08-19T11:15:00Z",
        "usuario": "Carlos López"
      }
    ]
  },
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123461"
}
```

**Errores**:

- 404: Formulario no encontrado
- 403: Sin permisos para ver este formulario

### 4. Actualizar Formulario FSO

**PUT** `/forms/fso/{id}`

**Descripción**: Actualiza un formulario FSO existente.

**Path Parameters**:

- `id`: ID único del formulario FSO

**Request Body**:

```json
{
  "comentariosCaso": "string (optional)",
  "estado": "pendiente | completado | revisado (optional)",
  "puntuacionCliente": "string (optional)",
  "ubicacion": {
    "latitude": "number (optional)",
    "longitude": "number (optional)",
    "direccion": "string (optional)"
  }
}
```

**Procesamiento del Backend**:

1. Validar que el formulario existe
2. Verificar permisos de edición
3. Validar campos actualizables
4. Crear registro en historial de cambios
5. Actualizar timestamp de modificación
6. Recalcular métricas si es necesario

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Formulario FSO actualizado exitosamente",
  "data": {
    "id": "fso_1724064600_abc123",
    "fechaActualizacion": "2025-08-19T12:00:00Z",
    "cambiosRealizados": ["comentariosCaso", "estado"]
  },
  "timestamp": "2025-08-19T12:00:00Z",
  "requestId": "req_123462"
}
```

### 5. Eliminar Formulario FSO

**DELETE** `/forms/fso/{id}`

**Descripción**: Elimina un formulario FSO (soft delete).

**Path Parameters**:

- `id`: ID único del formulario FSO

**Procesamiento del Backend**:

1. Validar que el formulario existe
2. Verificar permisos de eliminación
3. Realizar soft delete (marcado como eliminado)
4. Mover archivos adjuntos a archivo
5. Crear registro en historial
6. Notificar a supervisores si es necesario

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Formulario FSO eliminado exitosamente",
  "data": {
    "id": "fso_1724064600_abc123",
    "fechaEliminacion": "2025-08-19T12:30:00Z"
  },
  "timestamp": "2025-08-19T12:30:00Z",
  "requestId": "req_123463"
}
```

---

## 📁 Gestión de Archivos

### 1. Subir Archivo

**POST** `/files/upload`

**Descripción**: Sube un archivo al sistema con validación y procesamiento.

**Headers Adicionales**:

```
Content-Type: multipart/form-data
```

**Form Data**:

- `file`: archivo (requerido)
- `tipo`: "pdf" | "image" | "document"
- `descripcion`: descripción del archivo
- `formularioId`: ID del formulario relacionado (opcional)

**Procesamiento del Backend**:

1. Validar tipo y tamaño de archivo
2. Escanear archivo por malware
3. Generar nombre único para el archivo
4. Subir a storage seguro (AWS S3, Google Cloud, etc.)
5. Crear registro en base de datos
6. Generar thumbnail si es imagen
7. Procesar PDF si contiene datos estructurados

**Response Success (201)**:

```json
{
  "success": true,
  "message": "Archivo subido exitosamente",
  "data": {
    "id": "file_1724064600_xyz789",
    "nombre": "documento_original.pdf",
    "nombreArchivo": "file_1724064600_xyz789.pdf",
    "tipo": "application/pdf",
    "tamaño": 2048000,
    "url": "https://storage.example.com/files/file_1724064600_xyz789.pdf",
    "thumbnailUrl": "https://storage.example.com/thumbnails/file_1724064600_xyz789.jpg",
    "fechaSubida": "2025-08-19T13:00:00Z",
    "procesamiento": {
      "estado": "completado",
      "datosExtraidos": true,
      "textoOCR": true
    }
  },
  "timestamp": "2025-08-19T13:00:00Z",
  "requestId": "req_123464"
}
```

**Errores**:

- 413: Archivo demasiado grande
- 415: Tipo de archivo no soportado
- 400: Archivo corrupto o inválido

### 2. Obtener Información de Archivo

**GET** `/files/{id}`

**Descripción**: Obtiene información detallada de un archivo específico.

**Path Parameters**:

- `id`: ID único del archivo

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Información de archivo obtenida exitosamente",
  "data": {
    "id": "file_1724064600_xyz789",
    "nombre": "documento_original.pdf",
    "tipo": "application/pdf",
    "tamaño": 2048000,
    "url": "https://storage.example.com/files/file_1724064600_xyz789.pdf",
    "fechaSubida": "2025-08-19T13:00:00Z",
    "subidoPor": "Carlos López",
    "formularioRelacionado": "fso_1724064600_abc123",
    "procesamiento": {
      "estado": "completado",
      "datosExtraidos": true,
      "textoOCR": "Texto extraído del PDF...",
      "metadatos": {
        "paginas": 5,
        "autor": "Sistema FSO",
        "fechaCreacion": "2025-08-19T10:30:00Z"
      }
    }
  },
  "timestamp": "2025-08-19T13:00:00Z",
  "requestId": "req_123465"
}
```

### 3. Descargar Archivo

**GET** `/files/{id}/download`

**Descripción**: Descarga un archivo específico.

**Path Parameters**:

- `id`: ID único del archivo

**Query Parameters**:

- `inline`: true | false (para mostrar en navegador vs descargar)

**Procesamiento del Backend**:

1. Validar permisos de acceso
2. Generar URL firmada temporal
3. Registrar descarga en logs
4. Retornar archivo con headers apropiados

**Response Success (200)**:

- Content-Type: según tipo de archivo
- Content-Disposition: attachment o inline
- Contenido binario del archivo

### 4. Eliminar Archivo

**DELETE** `/files/{id}`

**Descripción**: Elimina un archivo del sistema.

**Path Parameters**:

- `id`: ID único del archivo

**Procesamiento del Backend**:

1. Verificar permisos de eliminación
2. Eliminar archivo del storage
3. Eliminar registros de base de datos
4. Actualizar formularios relacionados
5. Crear registro en logs de auditoría

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Archivo eliminado exitosamente",
  "data": {
    "id": "file_1724064600_xyz789",
    "fechaEliminacion": "2025-08-19T14:00:00Z"
  },
  "timestamp": "2025-08-19T14:00:00Z",
  "requestId": "req_123466"
}
```

---

## 📄 Procesamiento de PDFs

### 1. Procesar PDF para Extracción de Datos

**POST** `/pdf/process`

**Descripción**: Procesa un PDF para extraer datos estructurados de formularios FSO.

**Request Body**:

```json
{
  "archivoId": "string (required)",
  "tipoFormulario": "fso | inspeccion | reporte",
  "configuracionExtraccion": {
    "extraerTexto": true,
    "extraerTablas": true,
    "extraerCampos": true,
    "reconocerFirmas": false
  }
}
```

**Procesamiento del Backend**:

1. Validar que el archivo existe y es PDF
2. Aplicar OCR para extraer texto
3. Identificar campos de formulario
4. Extraer tablas y datos estructurados
5. Mapear datos a estructura FSO
6. Validar datos extraídos
7. Guardar resultados del procesamiento

**Response Success (200)**:

```json
{
  "success": true,
  "message": "PDF procesado exitosamente",
  "data": {
    "archivoId": "file_1724064600_xyz789",
    "procesamiento": {
      "estado": "completado",
      "fechaProcesamiento": "2025-08-19T14:30:00Z",
      "tiempoProcesamientoMs": 15000,
      "confianza": 0.95
    },
    "datosExtraidos": {
      "numeroOrden": "ORD-2025-001",
      "nombreCliente": "Juan Pérez",
      "nombreTecnico": "Carlos López",
      "fechaInspeccion": "2025-08-19",
      "campos": {
        "instalacionDireccionCorrecta": true,
        "combaFTB": true,
        "potenciaCorrecta": "-15 dBm",
        "puntuacionCliente": "9"
      }
    },
    "textoCompleto": "Texto completo extraído del PDF...",
    "metadatos": {
      "paginas": 5,
      "palabras": 1250,
      "tablas": 2,
      "imagenes": 3
    }
  },
  "timestamp": "2025-08-19T14:30:00Z",
  "requestId": "req_123467"
}
```

### 2. Generar PDF de Reporte

**POST** `/pdf/generate-report`

**Descripción**: Genera un PDF de reporte basado en datos de formulario FSO.

**Request Body**:

```json
{
  "formularioId": "string (required)",
  "tipoReporte": "completo | resumen | certificacion",
  "incluirImagenes": true,
  "incluirFirmas": false,
  "plantilla": "standard | detallada | certificacion"
}
```

**Procesamiento del Backend**:

1. Obtener datos del formulario
2. Cargar plantilla de reporte especificada
3. Generar gráficos y visualizaciones
4. Incluir imágenes y archivos adjuntos
5. Aplicar marca de agua y metadatos
6. Generar PDF con calidad optimizada
7. Subir a storage y crear registro

**Response Success (201)**:

```json
{
  "success": true,
  "message": "Reporte PDF generado exitosamente",
  "data": {
    "reporteId": "report_1724064600_def456",
    "archivoId": "file_1724064600_report789",
    "formularioId": "fso_1724064600_abc123",
    "tipoReporte": "completo",
    "fechaGeneracion": "2025-08-19T15:00:00Z",
    "url": "https://storage.example.com/reports/report_1724064600_def456.pdf",
    "tamaño": 3072000,
    "paginas": 8,
    "validoHasta": "2025-08-19T15:00:00Z"
  },
  "timestamp": "2025-08-19T15:00:00Z",
  "requestId": "req_123468"
}
```

---

## 📊 Administración de Datos

### 1. Obtener Estadísticas Dashboard

**GET** `/admin/dashboard`

**Descripción**: Obtiene estadísticas generales para el dashboard administrativo.

**Query Parameters**:

- `periodo`: "dia" | "semana" | "mes" | "año"
- `fechaInicio`: fecha inicio (ISO 8601)
- `fechaFin`: fecha fin (ISO 8601)

**Procesamiento del Backend**:

1. Calcular métricas de formularios
2. Generar estadísticas de rendimiento
3. Calcular tendencias temporales
4. Agregar datos por técnico/compañía
5. Generar alertas si hay problemas

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "periodo": {
      "inicio": "2025-08-01T00:00:00Z",
      "fin": "2025-08-19T23:59:59Z"
    },
    "formularios": {
      "total": 256,
      "completados": 230,
      "pendientes": 20,
      "revisados": 6,
      "porcentajeCompletados": 89.8
    },
    "rendimiento": {
      "puntuacionPromedio": 8.7,
      "tiempoPromedioCompletado": "00:45:30",
      "formulariosPorDia": 13.5,
      "eficienciaTecnicos": 92.3
    },
    "tecnicos": [
      {
        "nombre": "Carlos López",
        "formularios": 45,
        "puntuacionPromedio": 9.1,
        "eficiencia": 95.2
      }
    ],
    "companias": [
      {
        "nombre": "TechInstall Corp",
        "formularios": 89,
        "puntuacionPromedio": 8.8,
        "satisfaccionCliente": 9.2
      }
    ],
    "alertas": [
      {
        "tipo": "warning",
        "mensaje": "Formularios pendientes por más de 24 horas: 5",
        "cantidad": 5
      }
    ]
  },
  "timestamp": "2025-08-19T15:30:00Z",
  "requestId": "req_123469"
}
```

### 2. Exportar Datos

**GET** `/admin/export`

**Descripción**: Exporta datos del sistema en varios formatos.

**Query Parameters**:

- `tipo`: "formularios" | "usuarios" | "reportes"
- `formato`: "csv" | "excel" | "json"
- `fechaInicio`: fecha inicio (ISO 8601)
- `fechaFin`: fecha fin (ISO 8601)
- `filtros`: filtros adicionales (JSON encoded)

**Procesamiento del Backend**:

1. Validar parámetros de exportación
2. Aplicar filtros solicitados
3. Generar archivo en formato especificado
4. Aplicar compresión si es necesario
5. Crear URL de descarga temporal
6. Registrar exportación en logs

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Exportación generada exitosamente",
  "data": {
    "exportacionId": "export_1724064600_ghi789",
    "tipo": "formularios",
    "formato": "excel",
    "registros": 256,
    "tamaño": 1536000,
    "fechaGeneracion": "2025-08-19T16:00:00Z",
    "urlDescarga": "https://storage.example.com/exports/export_1724064600_ghi789.xlsx",
    "validoHasta": "2025-08-20T16:00:00Z"
  },
  "timestamp": "2025-08-19T16:00:00Z",
  "requestId": "req_123470"
}
```

### 3. Configuración del Sistema

**GET** `/admin/config`

**Descripción**: Obtiene la configuración actual del sistema.

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Configuración obtenida exitosamente",
  "data": {
    "aplicacion": {
      "version": "1.0.0",
      "ambiente": "production",
      "mantenimiento": false
    },
    "formularios": {
      "camposRequeridos": ["email", "numeroOrden", "tipoFSO"],
      "validacionAutomatica": true,
      "notificacionesSupervisor": true
    },
    "archivos": {
      "tamaañoMaximo": 10485760,
      "tiposPermitidos": ["pdf", "jpg", "png"],
      "retencionDias": 365
    },
    "notificaciones": {
      "email": true,
      "push": true,
      "sms": false
    }
  },
  "timestamp": "2025-08-19T16:30:00Z",
  "requestId": "req_123471"
}
```

### 4. Actualizar Configuración

**PUT** `/admin/config`

**Descripción**: Actualiza la configuración del sistema.

**Request Body**:

```json
{
  "formularios": {
    "validacionAutomatica": false,
    "notificacionesSupervisor": true
  },
  "archivos": {
    "tamaañoMaximo": 15728640
  }
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "Configuración actualizada exitosamente",
  "data": {
    "cambiosAplicados": [
      "formularios.validacionAutomatica",
      "archivos.tamaañoMaximo"
    ],
    "fechaActualizacion": "2025-08-19T17:00:00Z"
  },
  "timestamp": "2025-08-19T17:00:00Z",
  "requestId": "req_123472"
}
```

---

## 🔄 Tipos de Datos

### FormData

```typescript
interface FormData {
  id?: string;
  email: string;
  numeroOrden: string;
  tipoFSO: string;
  companiaInspeccion: string;
  nombreTecnico: string;
  instalacionDireccionCorrecta: boolean;
  combaFTB: boolean;
  colocacionGripCorrecta: boolean;
  alturaDropCorrecta: boolean;
  puntoApoyoAdecuado: boolean;
  dropLibreEmpalme: boolean;
  metrosDrop: string;
  colocacionGanchosCorrecta: boolean;
  recorridoDropExteriorAdecuado: boolean;
  colocacionTestTerminalCorrecta: boolean;
  jackSuperficieCorrecto: boolean;
  routerUbicadoCorrectamente: boolean;
  potenciaCorrecta: string;
  puntuacionCliente: string;
  telefonoCliente: number;
  nombreCliente: string;
  comentariosCaso?: string;
  ubicacion?: {
    latitude: number;
    longitude: number;
    direccion: string;
  };
}
```

### Usuario

```typescript
interface Usuario {
  id: string;
  email: string;
  nombre: string;
  role: 'tecnico' | 'supervisor' | 'admin';
  compania: string;
  activo: boolean;
  fechaCreacion: string;
  ultimoLogin: string;
}
```

### Archivo

```typescript
interface Archivo {
  id: string;
  nombre: string;
  nombreArchivo: string;
  tipo: string;
  tamaño: number;
  url: string;
  thumbnailUrl?: string;
  fechaSubida: string;
  subidoPor: string;
  formularioRelacionado?: string;
}
```

---

## ⚠️ Códigos de Error

### Errores de Cliente (4xx)

- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Token de autenticación inválido o expirado
- **403 Forbidden**: Sin permisos para realizar la acción
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto con el estado actual (ej: número de orden duplicado)
- **413 Payload Too Large**: Archivo demasiado grande
- **415 Unsupported Media Type**: Tipo de archivo no soportado
- **422 Unprocessable Entity**: Error de validación de datos
- **429 Too Many Requests**: Límite de rate limiting excedido

### Errores de Servidor (5xx)

- **500 Internal Server Error**: Error interno del servidor
- **502 Bad Gateway**: Error de gateway
- **503 Service Unavailable**: Servicio temporalmente no disponible
- **504 Gateway Timeout**: Timeout de gateway

### Estructura de Error

```json
{
  "success": false,
  "message": "Descripción del error",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detalles específicos del error",
    "field": "campo_con_error (si aplica)"
  },
  "timestamp": "2025-08-19T10:30:00Z",
  "requestId": "req_123456"
}
```

---

## 🔒 Seguridad

### Autenticación JWT

- Tokens con expiración de 1 hora
- Refresh tokens con expiración de 30 días
- Algoritmo HS256 para firmado

### Rate Limiting

- 100 requests por minuto por IP
- 1000 requests por hora por usuario autenticado
- 10 uploads por minuto por usuario

### Validación de Datos

- Sanitización de inputs
- Validación de tipos de datos
- Escape de caracteres especiales
- Validación de tamaño de archivos

### Logs de Auditoría

- Todas las acciones son registradas
- IP del cliente y user agent
- Timestamps precisos
- Datos sensibles hasheados

---

## 📝 Notas de Implementación

### Base de Datos

- Usar índices en campos de búsqueda frecuente
- Implementar soft deletes para preservar historial
- Backup automático diario
- Replicación para alta disponibilidad

### Storage de Archivos

- Usar CDN para distribución global
- Implementar lifecycle policies para archivos antiguos
- Encriptación en reposo y en tránsito
- Respaldo en múltiples regiones

### Monitoreo

- Métricas de rendimiento en tiempo real
- Alertas automáticas por errores
- Logs centralizados
- Dashboards de salud del sistema

### Escalabilidad

- API stateless para escalado horizontal
- Cache distribuido (Redis)
- Load balancers con health checks
- Auto-scaling basado en métricas
