/**
 * @fileoverview Script de prueba EDUCATIVO para refresh tokens
 * @description Te enseña paso a paso cómo funciona el sistema de autenticación
 */

const axios = require('axios');

// 🌐 URL base de nuestro servidor
const BASE_URL = 'http://localhost:3001';

// 👤 Credenciales que cambiaste (estas deben existir en tu base de datos)
const TEST_CREDENTIALS = {
    email: 'admin@fso-automation.com',
    password: 'admin123'
};

/**
 * 🎓 CLASE EDUCATIVA: RefreshTokenTester
 * 
 * Esta clase te enseña cómo funciona paso a paso el sistema de tokens.
 * Cada método hace UNA cosa específica y te explica qué está pasando.
 */
class RefreshTokenTester {
    constructor() {
        // 🏠 Propiedades de la clase (como variables globales de la clase)
        this.accessToken = null;    // 🔑 Token corto (1 hora) para acceder a APIs
        this.refreshToken = null;   // 🗝️ Token largo (30 días) para renovar el access token
        this.userInfo = null;       // 👤 Información del usuario logueado
    }

    /**
     * 🕐 DELAY: Pausa el programa por X milisegundos
     * @param {number} ms - Milisegundos a esperar
     * 
     * ¿Por qué necesitamos esto?
     * - Dar tiempo al servidor entre requests
     * - Simular comportamiento real de usuario
     * - Evitar sobrecargar el servidor
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 🌐 FUNCIÓN HELPER: Hacer peticiones HTTP de forma fácil
     * @param {string} method - GET, POST, PUT, DELETE
     * @param {string} url - Endpoint (ej: /api/auth/login)
     * @param {Object} data - Datos a enviar (solo para POST/PUT)
     * @param {string} token - Token de autorización (opcional)
     * 
     * ¿Qué hace esta función?
     * - Centraliza todas las peticiones HTTP
     * - Maneja errores de forma consistente
     * - Añade automáticamente headers de autorización
     */
    async makeRequest(method, url, data = null, token = null) {
        try {
            console.log(`   🔄 Haciendo petición: ${method} ${url}`);

            // 📝 Configuración de la petición
            const config = {
                method,                           // GET, POST, etc.
                url: `${BASE_URL}${url}`,        // URL completa
                headers: {}                       // Headers HTTP
            };

            // 🛡️ Si tenemos token, agregarlo al header Authorization
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log(`   🔑 Token incluido: ${token.substring(0, 20)}...`);
            }

            // 📦 Si hay datos, agregarios al body de la petición
            if (data) {
                config.data = data;
                config.headers['Content-Type'] = 'application/json';
                console.log(`   📦 Datos enviados:`, Object.keys(data));
            }

            // 🚀 Hacer la petición HTTP
            const response = await axios(config);
            console.log(`   ✅ Respuesta exitosa: ${response.status}`);

            return {
                success: true,
                data: response.data,
                status: response.status
            };

        } catch (error) {
            console.log(`   ❌ Error: ${error.response?.status || 'Sin conexión'}`);

            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status || 500
            };
        }
    }

    /**
     * 🔐 PASO 1: LOGIN (Iniciar Sesión)
     * 
     * ¿Qué hace?
     * - Envía email y password al servidor
     * - Recibe access token y refresh token
     * - Guarda tokens para usar después
     * 
     * ¿Por qué es importante?
     * - Es el primer paso de autenticación
     * - Sin esto, no puedes acceder a nada protegido
     */
    async testLogin() {
        console.log('\n🔐 PASO 1: Probando LOGIN...');
        console.log(`   Intentando login con: ${TEST_CREDENTIALS.email}`);

        const result = await this.makeRequest('POST', '/api/auth/login', TEST_CREDENTIALS);

        if (result.success) {
            // ✅ Login exitoso - extraer información importante
            this.accessToken = result.data.data.tokens.accessToken;
            this.refreshToken = result.data.data.tokens.refreshToken;
            this.userInfo = result.data.data.user;

            console.log('   ✅ Login exitoso');
            console.log(`   👤 Usuario: ${this.userInfo.email}`);
            console.log(`   🎭 Rol: ${this.userInfo.role}`);
            console.log(`   🏢 Empresa: ${this.userInfo.company || 'N/A'}`);
            console.log(`   🔑 Access Token: ${this.accessToken.substring(0, 30)}...`);
            console.log(`   🗝️ Refresh Token: ${this.refreshToken.substring(0, 30)}...`);
            console.log(`   ⏰ Expira en: ${result.data.data.tokens.expiresIn}`);

            return true;
        } else {
            console.log('   ❌ Error en login:', result.error.error?.message || result.error);
            console.log('   💡 Posibles causas:');
            console.log('      - Email o password incorrectos');
            console.log('      - Usuario no existe en la base de datos');
            console.log('      - Usuario inactivo');
            console.log('      - Rate limiting (demasiados intentos)');
            return false;
        }
    }

    /**
     * 🛡️ PASO 2: Verificar que el ACCESS TOKEN funciona
     * 
     * ¿Qué hace?
     * - Usa el access token para acceder a un endpoint protegido
     * - Verifica que el servidor reconoce al usuario
     * 
     * ¿Por qué es importante?
     * - Confirma que el token es válido
     * - Prueba la autenticación básica
     */
    async testAccessToken() {
        console.log('\n🛡️ PASO 2: Probando ACCESS TOKEN...');

        if (!this.accessToken) {
            console.log('   ❌ No hay access token (login falló)');
            return false;
        }

        const result = await this.makeRequest('GET', '/api/auth/me', null, this.accessToken);

        if (result.success) {
            console.log('   ✅ Access token válido');
            console.log(`   👤 Usuario autenticado: ${result.data.data.email}`);
            console.log(`   🎭 Rol: ${result.data.data.role}`);
            console.log(`   🟢 Estado: ${result.data.data.isActive ? 'Activo' : 'Inactivo'}`);
            return true;
        } else {
            console.log('   ❌ Access token inválido:', result.error.error?.message || result.error);
            console.log('   💡 Posibles causas:');
            console.log('      - Token expirado');
            console.log('      - Token malformado');
            console.log('      - Usuario desactivado');
            return false;
        }
    }

    /**
     * 🔄 PASO 3: REFRESH TOKEN (Renovar Access Token)
     * 
     * ¿Qué hace?
     * - Usa el refresh token para obtener un nuevo access token
     * - Implementa "token rotation" (los tokens viejos se invalidan)
     * 
     * ¿Por qué es importante?
     * - Permite mantener la sesión sin re-login
     * - Mejora la seguridad (tokens rotan constantemente)
     */
    async testRefreshToken() {
        console.log('\n🔄 PASO 3: Probando REFRESH TOKEN...');

        if (!this.refreshToken) {
            console.log('   ❌ No hay refresh token (login falló)');
            return false;
        }

        console.log('   📋 Tokens actuales:');
        console.log(`      Access Token: ${this.accessToken?.substring(0, 30) || 'N/A'}...`);
        console.log(`      Refresh Token: ${this.refreshToken?.substring(0, 30) || 'N/A'}...`);

        const result = await this.makeRequest('POST', '/api/auth/refresh', {
            refreshToken: this.refreshToken
        });

        if (result.success) {
            // 🔄 Guardar los tokens NUEVOS
            const oldAccessToken = this.accessToken;
            const oldRefreshToken = this.refreshToken;

            this.accessToken = result.data.data.accessToken;
            this.refreshToken = result.data.data.refreshToken;

            console.log('   ✅ Refresh exitoso - TOKENS RENOVADOS');
            console.log('   🔄 Token Rotation:');
            console.log(`      Nuevo Access:  ${this.accessToken.substring(0, 30)}...`);
            console.log(`      Nuevo Refresh: ${this.refreshToken.substring(0, 30)}...`);
            console.log(`   🔐 Seguridad: Tokens anteriores ahora INVÁLIDOS`);
            console.log(`   ⏰ Nuevo access token expira en: ${result.data.data.expiresIn}`);

            return true;
        } else {
            console.log('   ❌ Error en refresh:', result.error.error?.message || result.error);
            console.log('   💡 Posibles causas:');
            console.log('      - Refresh token expirado');
            console.log('      - Refresh token ya usado (token rotation)');
            console.log('      - Refresh token revocado');
            return false;
        }
    }

    /**
     * 🔍 PASO 4: Verificar que el NUEVO ACCESS TOKEN funciona
     * 
     * ¿Qué hace?
     * - Prueba que el nuevo access token obtenido funciona correctamente
     * 
     * ¿Por qué es importante?
     * - Confirma que el proceso de refresh fue exitoso
     * - Verifica la continuidad de la sesión
     */
    async testNewAccessToken() {
        console.log('\n🔍 PASO 4: Probando NUEVO ACCESS TOKEN...');

        const result = await this.makeRequest('GET', '/api/auth/me', null, this.accessToken);

        if (result.success) {
            console.log('   ✅ Nuevo access token funciona perfectamente');
            console.log(`   👤 Usuario: ${result.data.data.email}`);
            console.log(`   🔄 Sesión continúa sin interrupciones`);
            return true;
        } else {
            console.log('   ❌ Nuevo access token inválido:', result.error.error?.message || result.error);
            return false;
        }
    }

    /**
     * 📊 PASO 5: Información de tokens del usuario
     * 
     * ¿Qué hace?
     * - Obtiene estadísticas de los tokens activos del usuario
     * - Muestra cuántos dispositivos/sesiones están activas
     * 
     * ¿Por qué es útil?
     * - Control de sesiones múltiples
     * - Monitoreo de seguridad
     */
    async testTokenInfo() {
        console.log('\n📊 PASO 5: Información de TOKENS...');

        const result = await this.makeRequest('GET', '/api/auth/token-info', null, this.accessToken);

        if (result.success) {
            console.log('   ✅ Información obtenida');
            console.log(`   📱 Tokens activos: ${result.data.data.activeTokens}`);
            console.log(`   👤 Usuario: ${result.data.data.email}`);
            console.log('   📅 Tokens:');

            result.data.data.tokens.forEach((token, index) => {
                const createdAt = new Date(token.createdAt).toLocaleString();
                const expiresAt = new Date(token.expiresAt).toLocaleString();
                const status = token.isExpired ? '🔴 Expirado' : '🟢 Activo';
                console.log(`      ${index + 1}. Creado: ${createdAt} | Expira: ${expiresAt} | ${status}`);
            });

            return true;
        } else {
            console.log('   ❌ Error obteniendo info:', result.error.error?.message || result.error);
            return false;
        }
    }

    /**
     * 📋 PASO 6: Probar endpoint real de la aplicación
     * 
     * ¿Qué hace?
     * - Usa el token para acceder a un endpoint de negocio (FSO)
     * - Demuestra que la autenticación funciona en toda la app
     */
    async testFSOEndpoint() {
        console.log('\n📋 PASO 6: Probando ENDPOINT FSO...');

        const result = await this.makeRequest('GET', '/api/v1/forms?limit=2', null, this.accessToken);

        if (result.success) {
            console.log('   ✅ Endpoint FSO funcional');
            console.log(`   📄 FSOs obtenidos: ${result.data.data?.length || 0}`);
            console.log(`   📊 Total en BD: ${result.data.pagination?.total || 0}`);
            console.log('   🎯 Autenticación funcionando en TODA la aplicación');
            return true;
        } else {
            console.log('   ❌ Error en endpoint FSO:', result.error.error?.message || result.error);
            return false;
        }
    }

    /**
     * 👋 PASO 7: LOGOUT (Cerrar sesión)
     * 
     * ¿Qué hace?
     * - Revoca el refresh token actual
     * - Invalida la sesión de forma segura
     * 
     * ¿Por qué es importante?
     * - Seguridad: impide uso de tokens robados
     * - Limpieza: libera recursos del servidor
     */
    async testLogout() {
        console.log('\n👋 PASO 7: Probando LOGOUT...');

        const result = await this.makeRequest('POST', '/api/auth/logout', {
            refreshToken: this.refreshToken
        }, this.accessToken);

        if (result.success) {
            console.log('   ✅ Logout exitoso');
            console.log('   🗑️ Refresh token revocado');
            console.log('   🔒 Sesión cerrada de forma segura');
            return true;
        } else {
            console.log('   ❌ Error en logout:', result.error.error?.message || result.error);
            return false;
        }
    }

    /**
     * 🚫 PASO 8: Verificar que tokens revocados no funcionan
     * 
     * ¿Qué hace?
     * - Intenta usar el refresh token que acabamos de revocar
     * - Confirma que el sistema de seguridad funciona
     */
    async testRevokedToken() {
        console.log('\n🚫 PASO 8: Verificando tokens REVOCADOS...');

        const result = await this.makeRequest('POST', '/api/auth/refresh', {
            refreshToken: this.refreshToken
        });

        if (!result.success) {
            console.log('   ✅ Seguridad OK: Token revocado no funciona');
            console.log(`   🛡️ Error esperado: ${result.error.error?.message || result.error.message}`);
            console.log('   🔐 Sistema de seguridad funcionando correctamente');
            return true;
        } else {
            console.log('   ❌ PROBLEMA DE SEGURIDAD: Token revocado aún funciona');
            return false;
        }
    }

    /**
     * 🎯 FUNCIÓN PRINCIPAL: Ejecutar todas las pruebas
     */
    async runAllTests() {
        console.log('🧪 INICIANDO PRUEBAS EDUCATIVAS DEL SISTEMA DE REFRESH TOKENS');
        console.log('='.repeat(80));
        console.log('📚 Aprenderás cómo funciona cada parte del sistema de autenticación\n');

        const tests = [
            { name: 'Login', fn: () => this.testLogin() },
            { name: 'Access Token', fn: () => this.testAccessToken() },
            { name: 'Refresh Token', fn: () => this.testRefreshToken() },
            { name: 'Nuevo Access Token', fn: () => this.testNewAccessToken() },
            { name: 'Token Info', fn: () => this.testTokenInfo() },
            { name: 'FSO Endpoint', fn: () => this.testFSOEndpoint() },
            { name: 'Logout', fn: () => this.testLogout() },
            { name: 'Token Revocado', fn: () => this.testRevokedToken() }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                const result = await test.fn();
                if (result) {
                    passed++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.log(`   💥 Error inesperado en ${test.name}:`, error.message);
                failed++;
            }

            await this.delay(2000); // Pausa para leer
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 RESUMEN FINAL:');
        console.log(`✅ Pruebas exitosas: ${passed}`);
        console.log(`❌ Pruebas fallidas: ${failed}`);
        console.log(`📈 Porcentaje de éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

        if (failed === 0) {
            console.log('\n🎉 ¡FELICIDADES! Todas las pruebas pasaron.');
            console.log('🔐 Tu sistema de refresh tokens está funcionando perfectamente.');
            console.log('🎓 Ahora entiendes cómo funciona la autenticación moderna.');
        } else {
            console.log('\n⚠️ Algunas pruebas fallaron. Necesitamos investigar:');
            if (passed === 0) {
                console.log('💡 Probablemente el usuario no existe en la base de datos');
                console.log('💡 O las credenciales son incorrectas');
            }
        }
    }
}

/**
 * 🚀 FUNCIÓN PRINCIPAL
 * 
 * Esta función se ejecuta cuando corres: node test-refresh-tokens.js
 */
async function main() {
    console.log('🎓 TUTORIAL INTERACTIVO: Refresh Tokens en Node.js');
    console.log('📖 Este script te enseña paso a paso cómo funciona la autenticación');
    console.log('🔧 Puedes modificar las credenciales arriba en TEST_CREDENTIALS\n');

    const tester = new RefreshTokenTester();

    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('💥 Error fatal ejecutando pruebas:', error.message);
        console.log('\n🔍 DIAGNÓSTICO:');
        console.log('1. ¿Está el servidor corriendo en el puerto 3001?');
        console.log('2. ¿Las credenciales son correctas?');
        console.log('3. ¿El usuario existe en la base de datos?');
        process.exit(1);
    }
}

// 🏁 PUNTO DE ENTRADA
// Ejecutar solo si este archivo se llama directamente
if (require.main === module) {
    main().then(() => {
        console.log('\n✨ Tutorial completado. ¡Ahora sabes cómo funcionan los refresh tokens!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
}

module.exports = RefreshTokenTester;
