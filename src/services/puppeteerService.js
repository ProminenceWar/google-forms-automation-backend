// puppeteerService.js
// Servicio para automatización con Puppeteer

const puppeteer = require('puppeteer');
const config = require('../config');
const logger = require('../utils/logger');
const sessionService = require('./sessionService');

/**
 * Servicio para automatización de Google Forms con Puppeteer
 * Maneja el navegador, sesiones y envío de formularios
 */
class PuppeteerService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa el navegador Puppeteer
     */
    async initialize() {
        try {
            if (this.browser) {
                await this.cleanup();
            }

            const browserOptions = {
                headless: config.puppeteer.headless,
                defaultViewport: config.puppeteer.defaultViewport,
                userDataDir: config.puppeteer.userDataDir,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            };

            this.browser = await puppeteer.launch(browserOptions);
            this.page = await this.browser.newPage();

            // Configurar user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Cargar cookies de sesión si existen
            await this.loadSessionCookies();

            this.isInitialized = true;
            logger.info('PuppeteerService initialized successfully');

            return true;
        } catch (error) {
            logger.error('Error initializing PuppeteerService:', error);
            throw error;
        }
    }

    /**
     * Carga las cookies de sesión en el navegador
     */
    async loadSessionCookies() {
        try {
            const cookies = sessionService.getCookies();
            if (cookies && cookies.length > 0) {
                await this.page.setCookie(...cookies);
                logger.info(`Loaded ${cookies.length} session cookies`);
            }
        } catch (error) {
            logger.warn('Error loading session cookies:', error);
        }
    }

    /**
     * Guarda las cookies actuales del navegador
     */
    async saveSessionCookies() {
        try {
            if (!this.page) {
                throw new Error('Browser page not initialized');
            }

            const cookies = await this.page.cookies();
            const googleCookies = cookies.filter(cookie => 
                cookie.domain.includes('google.com') || 
                cookie.domain.includes('accounts.google.com')
            );

            if (googleCookies.length > 0) {
                await sessionService.saveSession(googleCookies, {
                    userAgent: await this.page.evaluate(() => navigator.userAgent),
                    url: this.page.url()
                });
                logger.info(`Saved ${googleCookies.length} Google cookies`);
                return true;
            } else {
                logger.warn('No Google cookies found to save');
                return false;
            }
        } catch (error) {
            logger.error('Error saving session cookies:', error);
            throw error;
        }
    }

    /**
     * Realiza login manual en Google
     * Abre la página de login y espera a que el usuario se autentique
     */
    async performManualLogin() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Navegar a Google Accounts
            await this.page.goto('https://accounts.google.com/signin', {
                waitUntil: 'networkidle0'
            });

            logger.info('Navigated to Google login page');

            // Esperar a que aparezca el formulario de login o se complete la autenticación
            await this.page.waitForSelector('input[type="email"], [data-testid="profile-menu"], .gb_d', {
                timeout: 60000
            });

            // Verificar si ya está logueado
            const isLoggedIn = await this.page.evaluate(() => {
                return !!(document.querySelector('[data-testid="profile-menu"]') || 
                         document.querySelector('.gb_d') ||
                         document.querySelector('[aria-label*="Google Account"]'));
            });

            if (isLoggedIn) {
                logger.info('User already logged in');
                await this.saveSessionCookies();
                return {
                    success: true,
                    message: 'Already logged in',
                    requiresManualAuth: false
                };
            }

            // Si no está logueado, preparar para auth manual
            logger.info('Manual authentication required');
            
            return {
                success: false,
                message: 'Manual authentication required. Please complete login in the browser.',
                requiresManualAuth: true,
                loginUrl: this.page.url()
            };

        } catch (error) {
            logger.error('Error during manual login:', error);
            throw error;
        }
    }

    /**
     * Verifica el estado de autenticación
     */
    async checkAuthStatus() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Navegar a una página de Google que requiere auth
            await this.page.goto('https://myaccount.google.com/', {
                waitUntil: 'networkidle0'
            });

            // Esperar un momento para que cargue
            await this.page.waitForTimeout(2000);

            // Verificar si está autenticado
            const isAuthenticated = await this.page.evaluate(() => {
                const url = window.location.href;
                return !url.includes('accounts.google.com/signin') && 
                       !url.includes('accounts.google.com/ServiceLogin');
            });

            if (isAuthenticated) {
                await this.saveSessionCookies();
                sessionService.updateActivity();
            }

            return {
                isAuthenticated,
                currentUrl: this.page.url(),
                hasValidSession: sessionService.hasValidSession()
            };

        } catch (error) {
            logger.error('Error checking auth status:', error);
            return {
                isAuthenticated: false,
                currentUrl: null,
                hasValidSession: false,
                error: error.message
            };
        }
    }

    /**
     * Envía datos a un formulario de Google
     * @param {string} formUrl - URL del formulario de Google
     * @param {Object} formData - Datos a enviar
     */
    async submitGoogleForm(formUrl, formData) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            logger.info('Starting Google Form submission', { formUrl });

            // Navegar al formulario
            await this.page.goto(formUrl, {
                waitUntil: 'networkidle0'
            });

            // Esperar a que cargue el formulario
            await this.page.waitForSelector('form, [role="main"]', { timeout: 10000 });

            // Mapear y llenar campos del formulario
            const fieldSelectors = [
                'input[type="text"]',
                'input[type="email"]',
                'input[type="tel"]',
                'input[type="number"]',
                'textarea',
                'input[type="radio"]',
                'input[type="checkbox"]',
                'select'
            ];

            let filledFields = 0;
            const fieldValues = Object.values(formData).filter(value => 
                value !== null && value !== undefined && value !== ''
            );

            // Intentar llenar campos de texto/email/textarea en orden
            for (const selector of fieldSelectors.slice(0, 4)) { // Solo campos de texto
                const fields = await this.page.$$(selector);
                
                for (let i = 0; i < fields.length && filledFields < fieldValues.length; i++) {
                    const field = fields[i];
                    const isVisible = await field.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    });

                    if (isVisible) {
                        const value = fieldValues[filledFields];
                        if (value) {
                            await field.click();
                            await field.evaluate(el => el.value = '');
                            await field.type(String(value));
                            filledFields++;
                            logger.info(`Filled field ${filledFields}: ${String(value).substring(0, 50)}...`);
                            await this.page.waitForTimeout(500);
                        }
                    }
                }
            }

            // Buscar y hacer clic en el botón de envío
            const submitSelectors = [
                '[type="submit"]',
                '[role="button"][jsname]',
                'div[role="button"]:has-text("Enviar")',
                'div[role="button"]:has-text("Submit")',
                '[data-testid="submit"], [aria-label*="submit"], [aria-label*="Enviar"]'
            ];

            let submitted = false;
            for (const selector of submitSelectors) {
                try {
                    const submitButton = await this.page.$(selector);
                    if (submitButton) {
                        const isVisible = await submitButton.evaluate(el => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden';
                        });

                        if (isVisible) {
                            await submitButton.click();
                            submitted = true;
                            logger.info('Form submitted successfully');
                            break;
                        }
                    }
                } catch (err) {
                    // Continuar con el siguiente selector
                    continue;
                }
            }

            if (!submitted) {
                // Intentar envío con Enter en el último campo
                await this.page.keyboard.press('Enter');
                submitted = true;
                logger.info('Form submitted using Enter key');
            }

            // Esperar confirmación o redirect
            await this.page.waitForTimeout(3000);

            const finalUrl = this.page.url();
            const success = finalUrl.includes('formResponse') || 
                           finalUrl.includes('closedform') ||
                           finalUrl !== formUrl;

            sessionService.updateActivity();

            return {
                success,
                filledFields,
                totalDataProvided: fieldValues.length,
                finalUrl,
                message: success ? 'Form submitted successfully' : 'Form submission may have failed'
            };

        } catch (error) {
            logger.error('Error submitting Google Form:', error);
            throw error;
        }
    }

    /**
     * Toma una captura de pantalla de la página actual
     */
    async takeScreenshot(path = '/tmp/screenshot.png') {
        try {
            if (!this.page) {
                throw new Error('Browser page not initialized');
            }

            await this.page.screenshot({ 
                path, 
                fullPage: true,
                type: 'png'
            });

            logger.info(`Screenshot saved to ${path}`);
            return path;
        } catch (error) {
            logger.error('Error taking screenshot:', error);
            throw error;
        }
    }

    /**
     * Obtiene información sobre la página actual
     */
    async getPageInfo() {
        try {
            if (!this.page) {
                return null;
            }

            const info = await this.page.evaluate(() => ({
                url: window.location.href,
                title: document.title,
                userAgent: navigator.userAgent
            }));

            return info;
        } catch (error) {
            logger.error('Error getting page info:', error);
            return null;
        }
    }

    /**
     * Limpia recursos del navegador
     */
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            this.isInitialized = false;
            logger.info('PuppeteerService cleaned up');
        } catch (error) {
            logger.error('Error during PuppeteerService cleanup:', error);
        }
    }
}

// Crear instancia singleton
const puppeteerService = new PuppeteerService();

module.exports = puppeteerService;
