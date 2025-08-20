// sessionController.js
// Controlador para manejo de sesiones

const sessionService = require('../services/sessionService');
const puppeteerService = require('../services/puppeteerService');
const logger = require('../utils/logger');

/**
 * Controlador para endpoints de manejo de sesión
 */
class SessionController {

    /**
     * POST /api/session/login
     * Inicia el proceso de login manual en Google
     */
    async login(req, res) {
        try {
            logger.info('Login request received');

            // Inicializar servicios si es necesario
            await sessionService.initialize();

            // Verificar si ya hay una sesión válida
            if (sessionService.hasValidSession()) {
                const authStatus = await puppeteerService.checkAuthStatus();
                if (authStatus.isAuthenticated) {
                    return res.status(200).json({
                        success: true,
                        message: 'Already logged in',
                        requiresManualAuth: false,
                        sessionStatus: sessionService.getSessionStatus()
                    });
                }
            }

            // Iniciar proceso de login manual
            const loginResult = await puppeteerService.performManualLogin();

            if (loginResult.requiresManualAuth) {
                return res.status(202).json({
                    success: false,
                    message: loginResult.message,
                    requiresManualAuth: true,
                    instructions: 'Please complete the Google login process in your browser window, then check session status.',
                    loginUrl: loginResult.loginUrl
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: loginResult.message,
                    requiresManualAuth: false,
                    sessionStatus: sessionService.getSessionStatus()
                });
            }

        } catch (error) {
            logger.error('Error in login controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * GET /api/session/status
     * Verifica el estado actual de la sesión
     */
    async getStatus(req, res) {
        try {
            logger.info('Session status check requested');

            // Inicializar servicio de sesión si es necesario
            await sessionService.initialize();

            // Obtener estado básico de la sesión
            const sessionStatus = sessionService.getSessionStatus();

            // Si hay sesión válida, verificar autenticación con Google
            if (sessionStatus.isValid) {
                try {
                    const authStatus = await puppeteerService.checkAuthStatus();

                    return res.status(200).json({
                        session: {
                            ...sessionStatus,
                            isAuthenticated: authStatus.isAuthenticated,
                            currentUrl: authStatus.currentUrl
                        },
                        browser: {
                            isInitialized: puppeteerService.isInitialized,
                            pageInfo: await puppeteerService.getPageInfo()
                        },
                        timestamp: new Date().toISOString()
                    });
                } catch (browserError) {
                    logger.warn('Error checking browser auth status:', browserError);

                    return res.status(200).json({
                        session: {
                            ...sessionStatus,
                            isAuthenticated: false,
                            authCheckError: browserError.message
                        },
                        browser: {
                            isInitialized: false,
                            error: 'Browser not available'
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                return res.status(200).json({
                    session: sessionStatus,
                    browser: {
                        isInitialized: puppeteerService.isInitialized,
                        pageInfo: null
                    },
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            logger.error('Error in session status controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error checking session status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * POST /api/session/logout
     * Cierra la sesión actual y limpia cookies
     */
    async logout(req, res) {
        try {
            logger.info('Logout request received');

            // Limpiar sesión
            await sessionService.clearSession();

            // Limpiar navegador
            await puppeteerService.cleanup();

            logger.info('Session logged out successfully');

            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error in logout controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during logout',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * POST /api/session/refresh
     * Actualiza la actividad de la sesión
     */
    async refresh(req, res) {
        try {
            logger.info('Session refresh requested');

            if (!sessionService.hasValidSession()) {
                return res.status(401).json({
                    success: false,
                    message: 'No valid session to refresh'
                });
            }

            // Actualizar actividad
            sessionService.updateActivity();

            // Verificar estado actual
            const authStatus = await puppeteerService.checkAuthStatus();

            res.status(200).json({
                success: true,
                message: 'Session refreshed successfully',
                sessionStatus: sessionService.getSessionStatus(),
                isAuthenticated: authStatus.isAuthenticated,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error in session refresh controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error refreshing session',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * GET /api/session/active
     * Obtiene las sesiones activas del sistema
     */
    async getActiveSessions(req, res) {
        try {
            logger.info('Active sessions request received');

            // Obtener información de sesiones activas
            const sessionStatus = sessionService.getSessionStatus();
            const activeSessions = sessionService.getActiveSessions();

            res.status(200).json({
                success: true,
                message: 'Active sessions retrieved successfully',
                data: {
                    sessionStatus: sessionStatus,
                    activeSessions: activeSessions,
                    totalActive: activeSessions ? activeSessions.length : 0,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Error getting active sessions:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error getting active sessions',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new SessionController();
