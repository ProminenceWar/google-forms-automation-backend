/**
 * @fileoverview Rutas Administrativas
 * @description Define todas las rutas para funcionalidad administrativa
 */

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Controladores
const dashboardController = require('../controllers/dashboardController');
const exportController = require('../controllers/exportController');
const configController = require('../controllers/configController');
const reportsController = require('../controllers/reportsController');

// Middleware global para rutas administrativas
router.use(authenticateToken);

// =============================================================================
// RUTAS DEL DASHBOARD
// =============================================================================

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Obtener estadísticas del dashboard
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para filtrar datos
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para filtrar datos
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *         description: Zona horaria
 *         example: "America/Mexico_City"
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/dashboard/stats', dashboardController.getDashboardStats);

/**
 * @swagger
 * /api/admin/dashboard/performance:
 *   get:
 *     summary: Obtener métricas de rendimiento del sistema
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas de rendimiento obtenidas
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/dashboard/performance', dashboardController.getPerformanceMetrics);

// =============================================================================
// RUTAS DE EXPORTACIÓN
// =============================================================================

/**
 * @swagger
 * /api/admin/export/forms/csv:
 *   get:
 *     summary: Exportar formularios en formato CSV
 *     tags: [Admin - Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tipoFSO
 *         schema:
 *           type: string
 *       - in: query
 *         name: companiaInspeccion
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Incluir detalles adicionales
 *     responses:
 *       200:
 *         description: Archivo CSV generado
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/export/forms/csv', requireRole(['admin', 'manager']), exportController.exportFormsCSV);

/**
 * @swagger
 * /api/admin/export/forms/excel:
 *   get:
 *     summary: Exportar formularios en formato Excel
 *     tags: [Admin - Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tipoFSO
 *         schema:
 *           type: string
 *       - in: query
 *         name: companiaInspeccion
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeCharts
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Incluir gráficos y estadísticas
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/export/forms/excel', requireRole(['admin', 'manager']), exportController.exportFormsExcel);

/**
 * @swagger
 * /api/admin/export/forms/json:
 *   get:
 *     summary: Exportar formularios en formato JSON
 *     tags: [Admin - Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tipoFSO
 *         schema:
 *           type: string
 *       - in: query
 *         name: companiaInspeccion
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Incluir metadata y estadísticas
 *     responses:
 *       200:
 *         description: Datos JSON exportados
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/export/forms/json', requireRole(['admin', 'manager']), exportController.exportFormsJSON);

// =============================================================================
// RUTAS DE CONFIGURACIÓN
// =============================================================================

/**
 * @swagger
 * /api/admin/config/system:
 *   get:
 *     summary: Obtener configuración del sistema
 *     tags: [Admin - Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida correctamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/config/system', configController.getSystemConfig);

/**
 * @swagger
 * /api/admin/config/system:
 *   put:
 *     summary: Actualizar configuración del sistema
 *     tags: [Admin - Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               features:
 *                 type: object
 *                 properties:
 *                   fileUpload:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                       maxSize:
 *                         type: string
 *                         example: "10MB"
 *                   export:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                       maxRecords:
 *                         type: number
 *               security:
 *                 type: object
 *                 properties:
 *                   passwordPolicy:
 *                     type: object
 *                     properties:
 *                       minLength:
 *                         type: number
 *                       requireUppercase:
 *                         type: boolean
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error del servidor
 */
router.put('/config/system', requireRole(['admin']), configController.updateSystemConfig);

/**
 * @swagger
 * /api/admin/config/users:
 *   get:
 *     summary: Obtener lista de usuarios del sistema
 *     tags: [Admin - Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Elementos por página
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtrar por rol
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['active', 'inactive', 'all']
 *         description: Filtrar por estado
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre, email o username
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/config/users', requireRole(['admin']), configController.getSystemUsers);

/**
 * @swagger
 * /api/admin/config/users:
 *   post:
 *     summary: Crear nuevo usuario del sistema
 *     tags: [Admin - Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - username
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: ['admin', 'manager', 'user']
 *                 default: 'user'
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Datos inválidos o usuario ya existe
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error del servidor
 */
router.post('/config/users', requireRole(['admin']), configController.createSystemUser);

/**
 * @swagger
 * /api/admin/config/users/{userId}/status:
 *   patch:
 *     summary: Activar/Desactivar usuario
 *     tags: [Admin - Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado del usuario actualizado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/config/users/:userId/status', requireRole(['admin']), configController.toggleUserStatus);

/**
 * @swagger
 * /api/admin/config/logs:
 *   get:
 *     summary: Obtener logs del sistema
 *     tags: [Admin - Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: ['error', 'warning', 'info', 'all']
 *         description: Nivel de log
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número de logs a obtener
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página de resultados
 *     responses:
 *       200:
 *         description: Logs obtenidos correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error del servidor
 */
router.get('/config/logs', requireRole(['admin']), configController.getSystemLogs);

// =============================================================================
// RUTAS DE REPORTES
// =============================================================================

/**
 * @swagger
 * /api/admin/reports/forms/pdf:
 *   get:
 *     summary: Generar reporte de formularios en PDF
 *     tags: [Admin - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tipoFSO
 *         schema:
 *           type: string
 *       - in: query
 *         name: companiaInspeccion
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Incluir detalles de formularios
 *     responses:
 *       200:
 *         description: Reporte PDF generado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/reports/forms/pdf', requireRole(['admin', 'manager']), reportsController.generateFormsReport);

/**
 * @swagger
 * /api/admin/reports/stats/pdf:
 *   get:
 *     summary: Generar reporte estadístico en PDF
 *     tags: [Admin - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Período en días
 *         example: "30"
 *       - in: query
 *         name: includeCharts
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Incluir gráficos y análisis
 *     responses:
 *       200:
 *         description: Reporte estadístico PDF generado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/reports/stats/pdf', requireRole(['admin', 'manager']), reportsController.generateStatsReport);

// =============================================================================
// MANEJO DE ERRORES PARA RUTAS NO ENCONTRADAS
// =============================================================================
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Ruta administrativa no encontrada',
            type: 'ROUTE_NOT_FOUND'
        }
    });
});

module.exports = router;
