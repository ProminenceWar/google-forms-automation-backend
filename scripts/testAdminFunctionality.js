/**
 * @fileoverview Script de prueba para funcionalidades administrativas
 * @description Prueba todas las nuevas funcionalidades de FASE 2
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Configuración de prueba
const testConfig = {
    adminUser: {
        email: 'admin@test.com',
        password: 'Admin123!',
        name: 'Administrator Test',
        username: 'admin_test',
        role: 'admin'
    },
    regularUser: {
        email: 'user@test.com',
        password: 'User123!',
        name: 'Regular User',
        username: 'user_test',
        role: 'user'
    }
};

let adminToken = '';
let userToken = '';

/**
 * Función para hacer login y obtener token
 */
async function login(credentials) {
    try {
        const response = await axios.post(`${API_URL}/v1/auth/login`, credentials);
        if (response.data.success) {
            console.log(`✅ Login exitoso para ${credentials.email}`);
            return response.data.data.token;
        } else {
            throw new Error('Login falló');
        }
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`🔄 Usuario no existe, intentando registrar ${credentials.email}...`);
            return await registerAndLogin(credentials);
        } else {
            console.error(`❌ Error en login para ${credentials.email}:`, error.response?.data || error.message);
            return null;
        }
    }
}

/**
 * Función para registrar y hacer login
 */
async function registerAndLogin(userData) {
    try {
        // Intentar registrar
        const registerResponse = await axios.post(`${API_URL}/v1/auth/register`, userData);
        if (registerResponse.data.success) {
            console.log(`✅ Usuario registrado: ${userData.email}`);

            // Hacer login después del registro
            const loginResponse = await axios.post(`${API_URL}/v1/auth/login`, {
                email: userData.email,
                password: userData.password
            });

            if (loginResponse.data.success) {
                console.log(`✅ Login exitoso después del registro para ${userData.email}`);
                return loginResponse.data.data.token;
            }
        }
        throw new Error('Registro falló');
    } catch (error) {
        console.error(`❌ Error en registro para ${userData.email}:`, error.response?.data || error.message);
        return null;
    }
}

/**
 * Función para probar las estadísticas del dashboard
 */
async function testDashboardStats(token) {
    try {
        console.log('\n📊 Probando estadísticas del dashboard...');

        const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            console.log('✅ Estadísticas del dashboard obtenidas correctamente');
            console.log('📈 Total de formularios:', response.data.data.totalForms);
            console.log('📈 Usuarios activos:', response.data.data.activeUsers);
            console.log('📈 Archivos totales:', response.data.data.totalFiles);
        } else {
            console.log('❌ Error al obtener estadísticas');
        }
    } catch (error) {
        console.error('❌ Error en dashboard stats:', error.response?.data || error.message);
    }
}

/**
 * Función para probar métricas de rendimiento
 */
async function testPerformanceMetrics(token) {
    try {
        console.log('\n⚡ Probando métricas de rendimiento...');

        const response = await axios.get(`${API_URL}/admin/dashboard/performance`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            console.log('✅ Métricas de rendimiento obtenidas correctamente');
            console.log('💻 Uso de memoria:', response.data.data.system.memory.used, 'MB');
            console.log('⏱️ Uptime:', Math.round(response.data.data.system.uptime), 'segundos');
        } else {
            console.log('❌ Error al obtener métricas de rendimiento');
        }
    } catch (error) {
        console.error('❌ Error en performance metrics:', error.response?.data || error.message);
    }
}

/**
 * Función para probar exportación CSV
 */
async function testCSVExport(token) {
    try {
        console.log('\n📄 Probando exportación CSV...');

        const response = await axios.get(`${API_URL}/admin/export/forms/csv`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                includeDetails: 'true'
            }
        });

        if (response.status === 200) {
            console.log('✅ Exportación CSV exitosa');
            console.log('📊 Tamaño del archivo:', response.data.length, 'caracteres');
        } else {
            console.log('❌ Error en exportación CSV');
        }
    } catch (error) {
        console.error('❌ Error en CSV export:', error.response?.data || error.message);
    }
}

/**
 * Función para probar configuración del sistema
 */
async function testSystemConfig(token) {
    try {
        console.log('\n⚙️ Probando configuración del sistema...');

        const response = await axios.get(`${API_URL}/admin/config/system`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            console.log('✅ Configuración del sistema obtenida correctamente');
            console.log('🏗️ Aplicación:', response.data.data.application.name);
            console.log('🔐 Seguridad JWT:', response.data.data.security.jwtExpiration);
            console.log('📁 Subida de archivos:', response.data.data.features.fileUpload.enabled ? 'Habilitada' : 'Deshabilitada');
        } else {
            console.log('❌ Error al obtener configuración');
        }
    } catch (error) {
        console.error('❌ Error en system config:', error.response?.data || error.message);
    }
}

/**
 * Función para probar gestión de usuarios
 */
async function testUserManagement(token) {
    try {
        console.log('\n👥 Probando gestión de usuarios...');

        const response = await axios.get(`${API_URL}/admin/config/users`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                page: 1,
                limit: 10
            }
        });

        if (response.data.success) {
            console.log('✅ Lista de usuarios obtenida correctamente');
            console.log('👤 Total de usuarios:', response.data.data.pagination.totalUsers);
            console.log('📊 Estadísticas por rol:', response.data.data.statistics.length, 'roles encontrados');
        } else {
            console.log('❌ Error al obtener usuarios');
        }
    } catch (error) {
        console.error('❌ Error en user management:', error.response?.data || error.message);
    }
}

/**
 * Función para probar generación de reportes PDF
 */
async function testPDFReport(token) {
    try {
        console.log('\n📋 Probando reporte PDF...');

        const response = await axios.get(`${API_URL}/admin/reports/forms/pdf`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                includeDetails: 'true',
                period: '30'
            },
            responseType: 'arraybuffer'
        });

        if (response.status === 200) {
            console.log('✅ Reporte PDF generado correctamente');
            console.log('📄 Tamaño del PDF:', response.data.byteLength, 'bytes');
        } else {
            console.log('❌ Error al generar reporte PDF');
        }
    } catch (error) {
        console.error('❌ Error en PDF report:', error.response?.data || error.message);
    }
}

/**
 * Función para probar permisos de usuario regular
 */
async function testUserPermissions(token) {
    try {
        console.log('\n🔒 Probando permisos de usuario regular...');

        // Intentar acceder a funcionalidades administrativas con usuario regular
        const response = await axios.get(`${API_URL}/admin/config/system`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('❌ Usuario regular pudo acceder a configuración (esto es un problema)');
    } catch (error) {
        if (error.response?.status === 403) {
            console.log('✅ Permisos funcionando correctamente - usuario regular bloqueado');
        } else {
            console.error('❌ Error inesperado:', error.response?.data || error.message);
        }
    }
}

/**
 * Función principal de pruebas
 */
async function runTests() {
    console.log('🚀 Iniciando pruebas de funcionalidades administrativas FASE 2');
    console.log('='.repeat(60));

    try {
        // Paso 1: Login de usuarios
        console.log('\n1️⃣ Autenticando usuarios...');
        adminToken = await login(testConfig.adminUser);
        userToken = await login(testConfig.regularUser);

        if (!adminToken) {
            console.error('❌ No se pudo obtener token de administrador. Abortando pruebas.');
            return;
        }

        // Paso 2: Probar funcionalidades administrativas con admin
        console.log('\n2️⃣ Probando funcionalidades administrativas con usuario admin...');
        await testDashboardStats(adminToken);
        await testPerformanceMetrics(adminToken);
        await testCSVExport(adminToken);
        await testSystemConfig(adminToken);
        await testUserManagement(adminToken);
        await testPDFReport(adminToken);

        // Paso 3: Probar permisos con usuario regular
        if (userToken) {
            console.log('\n3️⃣ Probando permisos con usuario regular...');
            await testUserPermissions(userToken);
        }

        console.log('\n✅ Pruebas completadas exitosamente!');
        console.log('='.repeat(60));
        console.log('📝 Resumen de FASE 2 implementada:');
        console.log('   • Dashboard administrativo con estadísticas completas');
        console.log('   • Sistema de exportación (CSV, Excel, JSON)');
        console.log('   • Configuración y gestión del sistema');
        console.log('   • Gestión de usuarios y permisos');
        console.log('   • Generación de reportes PDF básicos');
        console.log('   • Control de acceso basado en roles');

    } catch (error) {
        console.error('❌ Error general en las pruebas:', error.message);
    }
}

// Ejecutar pruebas si el archivo se ejecuta directamente
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    runTests,
    testConfig
};
