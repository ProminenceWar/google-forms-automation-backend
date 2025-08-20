/**
 * Script para probar todos los endpoints de la API
 * Verifica que todos los controladores y rutas estén funcionando
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const request = require('supertest');
const logger = require('../src/utils/logger');

/**
 * Test runner para verificar endpoints de la API
 */
class APIEndpointTester {
    constructor() {
        this.app = null;
        this.server = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Configura la aplicación Express para pruebas
     */
    async setupApp() {
        try {
            logger.info('🚀 Configurando aplicación Express para pruebas...');

            // Importar la aplicación
            this.app = require('../src/app');

            logger.info('✅ Aplicación Express configurada');
            return true;
        } catch (error) {
            logger.error('❌ Error al configurar aplicación:', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Ejecuta una prueba de endpoint
     */
    async testEndpoint(method, endpoint, expectedStatus = 200, data = null, token = null) {
        try {
            let req = request(this.app)[method.toLowerCase()](endpoint);

            if (token) {
                req = req.set('Authorization', `Bearer ${token}`);
            }

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                req = req.send(data);
            }

            const response = await req;

            if (response.status === expectedStatus) {
                this.testResults.passed++;
                logger.info(`✅ ${method} ${endpoint} - Status: ${response.status}`);
                return { success: true, response };
            } else {
                this.testResults.failed++;
                const error = `Expected ${expectedStatus}, got ${response.status}`;
                this.testResults.errors.push(`${method} ${endpoint}: ${error}`);
                logger.warn(`⚠️ ${method} ${endpoint} - Expected: ${expectedStatus}, Got: ${response.status}`);
                return { success: false, error, response };
            }
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push(`${method} ${endpoint}: ${error.message}`);
            logger.error(`❌ ${method} ${endpoint} - Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ejecuta pruebas básicas de conectividad
     */
    async runBasicTests() {
        logger.info('🔍 Ejecutando pruebas básicas de API...');

        // Test de health check
        await this.testEndpoint('GET', '/api/v1/health', 200);

        // Test de ruta raíz
        await this.testEndpoint('GET', '/', 200);

        // Test de ruta inexistente (debe retornar 404)
        await this.testEndpoint('GET', '/api/v1/nonexistent', 404);
    }

    /**
     * Ejecuta pruebas de autenticación
     */
    async runAuthTests() {
        logger.info('🔐 Ejecutando pruebas de autenticación...');

        // Test de login con credenciales válidas
        const loginData = {
            email: 'admin@fso-automation.com',
            password: 'admin123'
        };

        const loginResult = await this.testEndpoint('POST', '/api/v1/auth/login', 200, loginData);

        if (loginResult.success && loginResult.response.body.data?.token) {
            const token = loginResult.response.body.data.token;
            logger.info('✅ Login exitoso - Token obtenido');

            // Test de perfil con token
            await this.testEndpoint('GET', '/api/v1/auth/profile', 200, null, token);

            return token;
        } else {
            logger.warn('⚠️ No se pudo obtener token de autenticación');
            return null;
        }
    }

    /**
     * Ejecuta pruebas de formularios FSO
     */
    async runFSOFormTests(token) {
        logger.info('📋 Ejecutando pruebas de formularios FSO...');

        if (!token) {
            logger.warn('⚠️ Saltando pruebas de formularios - No hay token');
            return;
        }

        // Test de obtener formularios
        await this.testEndpoint('GET', '/api/v1/forms', 200, null, token);

        // Test de crear formulario
        const newForm = {
            title: `Instalación FSO Test - ${Date.now()}`,
            description: 'Formulario de prueba para instalación de fibra óptica',
            customer: {
                name: 'Cliente Test S.A.',
                address: 'Av. Test 123, Colonia Prueba, Ciudad Test, CP 12345',
                phone: '+52 555 123 4567',
                email: 'cliente.test@example.com'
            },
            installation: {
                type: 'fiber_optic',
                speed: '500mbps',
                equipment: ['ONT-500', 'Router-Test', 'Cable-25m'],
                estimatedDuration: 180
            },
            priority: 'medium',
            assignedTo: 'tech_test_001'
        };

        await this.testEndpoint('POST', '/api/v1/forms', 201, newForm, token);
    }

    /**
     * Ejecuta pruebas de archivos
     */
    async runFileTests(token) {
        logger.info('📁 Ejecutando pruebas de archivos...');

        if (!token) {
            logger.warn('⚠️ Saltando pruebas de archivos - No hay token');
            return;
        }

        // Test de obtener archivos
        await this.testEndpoint('GET', '/api/v1/files', 200, null, token);
    }

    /**
     * Ejecuta pruebas de sesiones
     */
    async runSessionTests() {
        logger.info('🔄 Ejecutando pruebas de sesiones...');

        // Test de obtener sesiones activas
        await this.testEndpoint('GET', '/api/v1/sessions/active', 200);
    }

    /**
     * Ejecuta todas las pruebas
     */
    async runAllTests() {
        logger.info('🧪 Iniciando pruebas completas de API...\n');

        const setupSuccess = await this.setupApp();
        if (!setupSuccess) {
            logger.error('❌ No se pudo configurar la aplicación');
            return false;
        }

        try {
            // Pruebas básicas
            await this.runBasicTests();

            // Pruebas de autenticación
            const token = await this.runAuthTests();

            // Pruebas de formularios
            await this.runFSOFormTests(token);

            // Pruebas de archivos
            await this.runFileTests(token);

            // Pruebas de sesiones
            await this.runSessionTests();

            // Resumen de resultados
            logger.info('\n📊 Resumen de pruebas:');
            logger.info(`✅ Pruebas exitosas: ${this.testResults.passed}`);
            logger.info(`❌ Pruebas fallidas: ${this.testResults.failed}`);

            if (this.testResults.errors.length > 0) {
                logger.warn('\n⚠️ Errores encontrados:');
                this.testResults.errors.forEach(error => {
                    logger.warn(`  - ${error}`);
                });
            }

            const success = this.testResults.failed === 0;
            if (success) {
                logger.info('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
                logger.info('✅ La API está lista para usar');
            } else {
                logger.warn('\n⚠️ Algunas pruebas fallaron');
                logger.info('🔧 Revisa los errores y la configuración');
            }

            return success;

        } catch (error) {
            logger.error('❌ Error durante las pruebas:', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Muestra información de endpoints disponibles
     */
    showAvailableEndpoints() {
        console.log('\n📚 Endpoints disponibles:');
        console.log('');
        console.log('🔐 Autenticación:');
        console.log('  POST /api/v1/auth/login         - Iniciar sesión');
        console.log('  POST /api/v1/auth/register      - Registrar usuario');
        console.log('  GET  /api/v1/auth/profile       - Obtener perfil');
        console.log('  POST /api/v1/auth/refresh       - Renovar token');
        console.log('  POST /api/v1/auth/logout        - Cerrar sesión');
        console.log('');
        console.log('📋 Formularios FSO:');
        console.log('  GET    /api/v1/forms            - Listar formularios');
        console.log('  POST   /api/v1/forms            - Crear formulario');
        console.log('  GET    /api/v1/forms/:id        - Obtener formulario');
        console.log('  PUT    /api/v1/forms/:id        - Actualizar formulario');
        console.log('  DELETE /api/v1/forms/:id        - Eliminar formulario');
        console.log('  POST   /api/v1/forms/:id/submit - Enviar formulario');
        console.log('');
        console.log('📁 Gestión de Archivos:');
        console.log('  GET    /api/v1/files            - Listar archivos');
        console.log('  POST   /api/v1/files/upload     - Subir archivo');
        console.log('  GET    /api/v1/files/:id        - Obtener archivo');
        console.log('  DELETE /api/v1/files/:id        - Eliminar archivo');
        console.log('');
        console.log('🔄 Sesiones:');
        console.log('  GET    /api/v1/sessions/active  - Sesiones activas');
        console.log('  POST   /api/v1/sessions/create  - Crear sesión');
        console.log('  DELETE /api/v1/sessions/:id     - Eliminar sesión');
        console.log('');
        console.log('🏥 Salud del Sistema:');
        console.log('  GET    /api/v1/health           - Estado del sistema');
        console.log('  GET    /                        - Información básica');
        console.log('');
    }
}

/**
 * Función principal
 */
async function main() {
    const tester = new APIEndpointTester();

    console.log('🧪 Iniciando verificación de endpoints de la API...\n');

    // Mostrar endpoints disponibles
    tester.showAvailableEndpoints();

    // Ejecutar pruebas
    const success = await tester.runAllTests();

    if (success) {
        console.log('\n🎯 Próximos pasos sugeridos:');
        console.log('1. Iniciar el servidor: npm start');
        console.log('2. Probar endpoints manualmente: http://localhost:3000');
        console.log('3. Revisar documentación de API: API_ENDPOINTS.md');
        console.log('4. Configurar frontend/cliente');
    } else {
        console.log('\n🔧 Problemas encontrados:');
        console.log('1. Revisa los errores mostrados arriba');
        console.log('2. Verifica que todos los controladores estén implementados');
        console.log('3. Comprueba la configuración de rutas');
        console.log('4. Ejecuta: npm run health para verificar la base de datos');
    }

    process.exit(success ? 0 : 1);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = APIEndpointTester;
