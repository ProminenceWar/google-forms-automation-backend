/**
 * Verificador rápido de configuración de MongoDB Atlas
 * Ejecuta: node scripts/verifyAtlasSetup.js
 */

const fs = require('fs');
const path = require('path');

class AtlasSetupVerifier {
    constructor() {
        this.checks = [];
        this.envPath = path.join(__dirname, '..', '.env');
    }

    /**
     * Verifica que el archivo .env existe
     */
    checkEnvFile() {
        const exists = fs.existsSync(this.envPath);
        this.checks.push({
            name: 'Archivo .env existe',
            status: exists ? '✅' : '❌',
            passed: exists,
            message: exists ? 'Archivo .env encontrado' : 'Archivo .env no existe. Crea uno basado en .env.example'
        });
        return exists;
    }

    /**
     * Verifica las variables de entorno requeridas
     */
    checkRequiredVariables() {
        if (!this.checkEnvFile()) return false;

        require('dotenv').config({ path: this.envPath });

        const requiredVars = [
            'MONGODB_ATLAS_USERNAME',
            'MONGODB_ATLAS_PASSWORD',
            'MONGODB_ATLAS_CLUSTER'
        ];

        const optionalVars = [
            'MONGODB_ATLAS_DATABASE',
            'USE_ATLAS'
        ];

        let allRequired = true;

        // Verificar variables requeridas
        requiredVars.forEach(varName => {
            const value = process.env[varName];
            const exists = value && value.trim() !== '';

            this.checks.push({
                name: `Variable ${varName}`,
                status: exists ? '✅' : '❌',
                passed: exists,
                message: exists ? 'Configurada' : 'Falta configurar'
            });

            if (!exists) allRequired = false;
        });

        // Verificar variables opcionales (solo informativo)
        optionalVars.forEach(varName => {
            const value = process.env[varName];
            const exists = value && value.trim() !== '';

            this.checks.push({
                name: `Variable ${varName} (opcional)`,
                status: exists ? '✅' : '⚠️',
                passed: true, // No afecta el resultado
                message: exists ? `Configurada: ${value}` : 'Usando valor por defecto'
            });
        });

        return allRequired;
    }

    /**
     * Verifica la estructura del proyecto
     */
    checkProjectStructure() {
        const requiredFiles = [
            'src/config/index.js',
            'src/database/connection.js',
            'scripts/connectToAtlas.js',
            'scripts/initDatabase.js',
            'playground-1.mongodb.js'
        ];

        requiredFiles.forEach(filePath => {
            const fullPath = path.join(__dirname, '..', filePath);
            const exists = fs.existsSync(fullPath);

            this.checks.push({
                name: `Archivo ${filePath}`,
                status: exists ? '✅' : '❌',
                passed: exists,
                message: exists ? 'Existe' : 'Archivo faltante'
            });
        });
    }

    /**
     * Verifica que las dependencias estén instaladas
     */
    checkDependencies() {
        const packageJsonPath = path.join(__dirname, '..', 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            this.checks.push({
                name: 'package.json',
                status: '❌',
                passed: false,
                message: 'package.json no encontrado'
            });
            return false;
        }

        const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
        const nodeModulesExists = fs.existsSync(nodeModulesPath);

        this.checks.push({
            name: 'Dependencias instaladas',
            status: nodeModulesExists ? '✅' : '❌',
            passed: nodeModulesExists,
            message: nodeModulesExists ? 'node_modules encontrado' : 'Ejecuta: npm install'
        });

        // Verificar dependencias específicas importantes
        const criticalDeps = ['mongoose', 'dotenv', 'express'];

        if (nodeModulesExists) {
            criticalDeps.forEach(dep => {
                const depPath = path.join(__dirname, '..', 'node_modules', dep);
                const exists = fs.existsSync(depPath);

                this.checks.push({
                    name: `Dependencia ${dep}`,
                    status: exists ? '✅' : '❌',
                    passed: exists,
                    message: exists ? 'Instalada' : 'Faltante'
                });
            });
        }

        return nodeModulesExists;
    }

    /**
     * Ejecuta todas las verificaciones
     */
    async runAllChecks() {
        console.log('🔍 Verificando configuración de MongoDB Atlas...\n');

        this.checkEnvFile();
        this.checkRequiredVariables();
        this.checkProjectStructure();
        this.checkDependencies();

        // Mostrar resultados
        console.log('📋 Resultados de verificación:\n');

        this.checks.forEach(check => {
            console.log(`${check.status} ${check.name}: ${check.message}`);
        });

        // Resumen
        const passed = this.checks.filter(c => c.passed).length;
        const total = this.checks.length;
        const allPassed = this.checks.every(c => c.passed);

        console.log(`\n📊 Resumen: ${passed}/${total} verificaciones pasaron`);

        if (allPassed) {
            console.log('\n🎉 ¡Configuración completa! Puedes ejecutar:');
            console.log('   npm run connect-atlas');
            console.log('   npm run setup-db');
            console.log('   npm start');
        } else {
            console.log('\n⚠️ Hay problemas que necesitan resolverse antes de continuar.');
            console.log('\n📚 Consulta la guía: docs/MONGODB_ATLAS_SETUP.md');
        }

        return allPassed;
    }

    /**
     * Genera un comando de conexión de ejemplo
     */
    generateConnectionExample() {
        require('dotenv').config({ path: this.envPath });

        const username = process.env.MONGODB_ATLAS_USERNAME || 'TU_USUARIO';
        const cluster = process.env.MONGODB_ATLAS_CLUSTER || 'cluster0.xxxxx.mongodb.net';
        const database = process.env.MONGODB_ATLAS_DATABASE || 'fso-automation';

        console.log('\n🔗 Ejemplo de cadena de conexión:');
        console.log(`mongodb+srv://${username}:***@${cluster}/${database}?retryWrites=true&w=majority`);
    }
}

// Ejecutar verificación si es llamado directamente
if (require.main === module) {
    const verifier = new AtlasSetupVerifier();
    verifier.runAllChecks()
        .then(success => {
            if (success) {
                verifier.generateConnectionExample();
            }
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Error durante la verificación:', error.message);
            process.exit(1);
        });
}

module.exports = AtlasSetupVerifier;
