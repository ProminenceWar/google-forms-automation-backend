/**
 * @fileoverview Script de prueba para el sistema de refresh tokens
 * @description Prueba completa del flujo de autenticación con refresh tokens
 */

const axios = require('axios');
const config = require('./src/config');

const BASE_URL = `http://localhost:3000`;

// Credenciales de prueba (usar las del usuario admin existente)
const TEST_CREDENTIALS = {
    email: 'admin@fso-automation.com',
    password: 'admin123'
};

class RefreshTokenTester {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.userInfo = null;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(method, url, data = null, token = null) {
        try {
            const config = {
                method,
                url: `${BASE_URL}${url}`,
                headers: {}
            };

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            if (data) {
                config.data = data;
                config.headers['Content-Type'] = 'application/json';
            }

            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status || 500
            };
        }
    }

    async testLogin() {
        console.log('🔐 Probando login...');

        const result = await this.makeRequest('POST', '/api/auth/login', TEST_CREDENTIALS);

        if (result.success) {
            this.accessToken = result.data.data.tokens.accessToken;
            this.refreshToken = result.data.data.tokens.refreshToken;
            this.userInfo = result.data.data.user;

            console.log('✅ Login exitoso');
            console.log(`   Usuario: ${this.userInfo.email}`);
            console.log(`   Rol: ${this.userInfo.role}`);
            console.log(`   Access Token: ${this.accessToken.substring(0, 50)}...`);
            console.log(`   Refresh Token: ${this.refreshToken.substring(0, 50)}...`);
            return true;
        } else {
            console.log('❌ Error en login:', result.error);
            return false;
        }
    }

    async testAccessToken() {
        console.log('\n📋 Probando access token...');

        const result = await this.makeRequest('GET', '/api/auth/me', null, this.accessToken);

        if (result.success) {
            console.log('✅ Access token válido');
            console.log(`   Usuario autenticado: ${result.data.data.email}`);
            return true;
        } else {
            console.log('❌ Access token inválido:', result.error);
            return false;
        }
    }

    async testRefreshToken() {
        console.log('\n🔄 Probando refresh token...');

        const result = await this.makeRequest('POST', '/api/auth/refresh', {
            refreshToken: this.refreshToken
        });

        if (result.success) {
            const oldAccessToken = this.accessToken;
            const oldRefreshToken = this.refreshToken;

            this.accessToken = result.data.data.accessToken;
            this.refreshToken = result.data.data.refreshToken;

            console.log('✅ Refresh exitoso');
            console.log(`   Nuevo Access Token: ${this.accessToken.substring(0, 50)}...`);
            console.log(`   Nuevo Refresh Token: ${this.refreshToken.substring(0, 50)}...`);
            console.log(`   Tokens rotados: ${oldAccessToken !== this.accessToken && oldRefreshToken !== this.refreshToken}`);
            return true;
        } else {
            console.log('❌ Error en refresh:', result.error);
            return false;
        }
    }

    async testNewAccessToken() {
        console.log('\n🔍 Probando nuevo access token...');

        const result = await this.makeRequest('GET', '/api/auth/me', null, this.accessToken);

        if (result.success) {
            console.log('✅ Nuevo access token válido');
            console.log(`   Usuario: ${result.data.data.email}`);
            return true;
        } else {
            console.log('❌ Nuevo access token inválido:', result.error);
            return false;
        }
    }

    async testTokenInfo() {
        console.log('\n📊 Probando información de tokens...');

        const result = await this.makeRequest('GET', '/api/auth/token-info', null, this.accessToken);

        if (result.success) {
            console.log('✅ Información de tokens obtenida');
            console.log(`   Tokens activos: ${result.data.data.activeTokens}`);
            console.log(`   Email: ${result.data.data.email}`);
            return true;
        } else {
            console.log('❌ Error obteniendo info de tokens:', result.error);
            return false;
        }
    }

    async testFSOEndpoint() {
        console.log('\n📋 Probando endpoint FSO con nuevo token...');

        const result = await this.makeRequest('GET', '/api/v1/forms?limit=2', null, this.accessToken);

        if (result.success) {
            console.log('✅ Endpoint FSO funcional con nuevo token');
            console.log(`   FSOs obtenidos: ${result.data.data?.length || 0}`);
            console.log(`   Total: ${result.data.pagination?.total || 0}`);
            return true;
        } else {
            console.log('❌ Error en endpoint FSO:', result.error);
            return false;
        }
    }

    async testLogout() {
        console.log('\n👋 Probando logout...');

        const result = await this.makeRequest('POST', '/api/auth/logout', {
            refreshToken: this.refreshToken
        }, this.accessToken);

        if (result.success) {
            console.log('✅ Logout exitoso');
            return true;
        } else {
            console.log('❌ Error en logout:', result.error);
            return false;
        }
    }

    async testUsedRefreshToken() {
        console.log('\n🚫 Probando refresh token usado/revocado...');

        const result = await this.makeRequest('POST', '/api/auth/refresh', {
            refreshToken: this.refreshToken
        });

        if (!result.success) {
            console.log('✅ Refresh token correctamente revocado después del logout');
            console.log(`   Error esperado: ${result.error.error?.message}`);
            return true;
        } else {
            console.log('❌ Refresh token aún funciona después del logout (problema de seguridad)');
            return false;
        }
    }

    async testAdminEndpoints() {
        console.log('\n👑 Probando endpoints administrativos...');

        // Primero hacer login nuevamente para obtener tokens frescos
        await this.testLogin();

        // Probar health check de tokens
        const healthResult = await this.makeRequest('GET', '/api/admin/tokens/health', null, this.accessToken);

        if (healthResult.success) {
            console.log('✅ Health check administrativo exitoso');
            console.log(`   Database OK: ${healthResult.data.data.database}`);
            console.log(`   Token Service OK: ${healthResult.data.data.tokenService}`);
            console.log(`   Usuarios activos: ${healthResult.data.data.activeUsers}`);
        } else {
            console.log('❌ Error en health check:', healthResult.error);
        }

        // Probar estadísticas de tokens
        const statsResult = await this.makeRequest('GET', '/api/admin/tokens/statistics', null, this.accessToken);

        if (statsResult.success) {
            console.log('✅ Estadísticas administrativas obtenidas');
            console.log(`   Total usuarios: ${statsResult.data.data.overview.totalUsers}`);
            console.log(`   Usuarios con tokens: ${statsResult.data.data.overview.usersWithTokens}`);
            console.log(`   Total tokens activos: ${statsResult.data.data.overview.totalActiveTokens}`);
        } else {
            console.log('❌ Error obteniendo estadísticas:', statsResult.error);
        }
    }

    async runAllTests() {
        console.log('🧪 Iniciando pruebas completas del sistema de refresh tokens\n');

        const tests = [
            { name: 'Login', fn: () => this.testLogin() },
            { name: 'Access Token', fn: () => this.testAccessToken() },
            { name: 'Refresh Token', fn: () => this.testRefreshToken() },
            { name: 'Nuevo Access Token', fn: () => this.testNewAccessToken() },
            { name: 'Token Info', fn: () => this.testTokenInfo() },
            { name: 'FSO Endpoint', fn: () => this.testFSOEndpoint() },
            { name: 'Logout', fn: () => this.testLogout() },
            { name: 'Refresh Token Revocado', fn: () => this.testUsedRefreshToken() },
            { name: 'Endpoints Admin', fn: () => this.testAdminEndpoints() }
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
                console.log(`❌ Error en prueba ${test.name}:`, error.message);
                failed++;
            }

            await this.delay(1000); // Pausa entre pruebas
        }

        console.log('\n📊 Resumen de pruebas:');
        console.log(`✅ Exitosas: ${passed}`);
        console.log(`❌ Fallidas: ${failed}`);
        console.log(`📈 Porcentaje de éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

        if (failed === 0) {
            console.log('\n🎉 ¡Todas las pruebas pasaron! El sistema de refresh tokens está funcionando correctamente.');
        } else {
            console.log('\n⚠️ Algunas pruebas fallaron. Revisar la implementación.');
        }
    }
}

// Función principal
async function main() {
    console.log('🚀 Sistema de Refresh Tokens - Pruebas de Integración');
    console.log('='.repeat(60));

    const tester = new RefreshTokenTester();

    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ Error ejecutando pruebas:', error.message);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().then(() => {
        console.log('\n✨ Pruebas completadas');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
}

module.exports = RefreshTokenTester;
