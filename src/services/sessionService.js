// sessionService.js
// Servicio para manejo de sesiones

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Servicio para manejo de sesiones de Google
 * Permite guardar y cargar cookies para mantener sesión persistente
 */
class SessionService {
    constructor() {
        this.sessionPath = config.session.filePath;
        this.sessionDir = path.dirname(this.sessionPath);
        this.sessionData = null;
        this.isValid = false;
        this.lastActivity = null;
    }

    /**
     * Inicializa el servicio de sesión
     * Crea el directorio de sesiones si no existe
     */
    async initialize() {
        try {
            // Crear directorio de sesiones si no existe
            await this.ensureSessionDirectory();
            
            // Cargar sesión existente si la hay
            await this.loadSession();
            
            logger.info('SessionService initialized successfully');
        } catch (error) {
            logger.error('Error initializing SessionService:', error);
            throw error;
        }
    }

    /**
     * Asegura que el directorio de sesiones existe
     */
    async ensureSessionDirectory() {
        try {
            await fs.access(this.sessionDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(this.sessionDir, { recursive: true });
                logger.info(`Created session directory: ${this.sessionDir}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Guarda la sesión (cookies) en archivo
     * @param {Array} cookies - Array de cookies de Puppeteer
     * @param {Object} metadata - Metadatos adicionales de la sesión
     */
    async saveSession(cookies, metadata = {}) {
        try {
            const sessionData = {
                cookies,
                metadata: {
                    ...metadata,
                    savedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + config.session.maxAge).toISOString()
                }
            };

            await fs.writeFile(this.sessionPath, JSON.stringify(sessionData, null, 2));
            
            this.sessionData = sessionData;
            this.isValid = true;
            this.lastActivity = new Date();

            logger.info('Session saved successfully', {
                cookieCount: cookies.length,
                expiresAt: sessionData.metadata.expiresAt
            });

            return true;
        } catch (error) {
            logger.error('Error saving session:', error);
            throw error;
        }
    }

    /**
     * Carga la sesión desde archivo
     * @returns {Object|null} Datos de sesión o null si no existe/es inválida
     */
    async loadSession() {
        try {
            const data = await fs.readFile(this.sessionPath, 'utf8');
            const sessionData = JSON.parse(data);

            // Verificar si la sesión ha expirado
            const expiresAt = new Date(sessionData.metadata.expiresAt);
            const now = new Date();

            if (now > expiresAt) {
                logger.warn('Session expired, removing session file');
                await this.clearSession();
                return null;
            }

            // Verificar timeout de inactividad
            if (this.lastActivity) {
                const timeSinceActivity = now - this.lastActivity;
                if (timeSinceActivity > config.session.timeout) {
                    logger.warn('Session timeout due to inactivity');
                    await this.clearSession();
                    return null;
                }
            }

            this.sessionData = sessionData;
            this.isValid = true;
            this.lastActivity = new Date();

            logger.info('Session loaded successfully', {
                cookieCount: sessionData.cookies.length,
                savedAt: sessionData.metadata.savedAt,
                expiresAt: sessionData.metadata.expiresAt
            });

            return sessionData;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('No existing session found');
                return null;
            }
            logger.error('Error loading session:', error);
            throw error;
        }
    }

    /**
     * Obtiene las cookies de la sesión actual
     * @returns {Array|null} Array de cookies o null si no hay sesión válida
     */
    getCookies() {
        if (!this.isValid || !this.sessionData) {
            return null;
        }
        
        this.lastActivity = new Date();
        return this.sessionData.cookies;
    }

    /**
     * Verifica si hay una sesión válida
     * @returns {boolean} True si hay sesión válida
     */
    hasValidSession() {
        return this.isValid && this.sessionData !== null;
    }

    /**
     * Obtiene el estado de la sesión
     * @returns {Object} Estado detallado de la sesión
     */
    getSessionStatus() {
        if (!this.hasValidSession()) {
            return {
                isValid: false,
                message: 'No active session'
            };
        }

        const now = new Date();
        const expiresAt = new Date(this.sessionData.metadata.expiresAt);
        const timeUntilExpiry = expiresAt - now;
        const timeSinceActivity = this.lastActivity ? now - this.lastActivity : 0;

        return {
            isValid: true,
            savedAt: this.sessionData.metadata.savedAt,
            expiresAt: this.sessionData.metadata.expiresAt,
            timeUntilExpiry: Math.max(0, timeUntilExpiry),
            timeSinceActivity,
            cookieCount: this.sessionData.cookies.length,
            lastActivity: this.lastActivity?.toISOString()
        };
    }

    /**
     * Actualiza la actividad de la sesión
     */
    updateActivity() {
        if (this.hasValidSession()) {
            this.lastActivity = new Date();
        }
    }

    /**
     * Limpia la sesión actual
     */
    async clearSession() {
        try {
            await fs.unlink(this.sessionPath);
            logger.info('Session file deleted');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Error deleting session file:', error);
            }
        }

        this.sessionData = null;
        this.isValid = false;
        this.lastActivity = null;
        
        logger.info('Session cleared');
    }
}

// Crear instancia singleton
const sessionService = new SessionService();

module.exports = sessionService;
