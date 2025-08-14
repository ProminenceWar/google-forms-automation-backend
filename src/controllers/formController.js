// formController.js
// Controlador para manejo de formularios

const puppeteerService = require('../services/puppeteerService');
const sessionService = require('../services/sessionService');
const { getAllMockData, getRandomMockData } = require('../utils/mockData');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Valida si una URL es un formulario de Google válido
 * @param {string} url - URL a validar
 * @returns {boolean} - True si es válida
 */
function isValidGoogleFormUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // Verificar dominio
        if (!urlObj.hostname.includes('docs.google.com')) {
            return false;
        }

        // Verificar path
        if (!urlObj.pathname.includes('/forms/')) {
            return false;
        }

        // Verificar patrones comunes
        const validPatterns = [
            /\/forms\/d\/e\/[^\/]+\/viewform/,
            /\/forms\/d\/[^\/]+\/viewform/,
            /\/forms\/[^\/]+\/viewform/
        ];

        return validPatterns.some(pattern => pattern.test(urlObj.pathname));

    } catch (error) {
        return false;
    }
}

/**
 * Controlador para endpoints de manejo de formularios
 */
class FormController {

    /**
     * POST /api/forms/submit
     * Envía datos a un formulario de Google
     */
    async submitForm(req, res) {
        try {
            logger.info('Form submission request received');

            const { formUrl, formData } = req.body;

            // Validaciones de entrada
            if (!formUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Form URL is required',
                    error: 'Missing formUrl in request body'
                });
            }

            if (!formData || typeof formData !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Form data is required',
                    error: 'Missing or invalid formData in request body'
                });
            }

            // Verificar que es una URL válida de Google Forms
            if (!isValidGoogleFormUrl(formUrl)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Google Forms URL',
                    error: 'URL must be a valid Google Forms URL'
                });
            }

            // Verificar sesión válida
            if (!sessionService.hasValidSession()) {
                return res.status(401).json({
                    success: false,
                    message: 'No valid session found',
                    error: 'Please login first using /api/session/login'
                });
            }

            // Verificar autenticación
            const authStatus = await puppeteerService.checkAuthStatus();
            if (!authStatus.isAuthenticated) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated with Google',
                    error: 'Please complete Google authentication first'
                });
            }

            // Enviar formulario
            logger.info('Submitting form', { 
                formUrl, 
                dataFields: Object.keys(formData).length 
            });

            const result = await puppeteerService.submitGoogleForm(formUrl, formData);

            // Registrar resultado
            logger.info('Form submission completed', {
                success: result.success,
                filledFields: result.filledFields,
                finalUrl: result.finalUrl
            });

            // Respuesta exitosa
            res.status(200).json({
                success: result.success,
                message: result.message,
                details: {
                    formUrl,
                    filledFields: result.filledFields,
                    totalDataProvided: result.totalDataProvided,
                    finalUrl: result.finalUrl,
                    submittedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Error in form submission controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during form submission',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * GET /api/forms/mock-data
     * Obtiene datos de prueba para formularios
     */
    async getMockData(req, res) {
        try {
            logger.info('Mock data request received');

            const { type } = req.query;

            if (type) {
                // Obtener datos específicos por tipo
                const allMockData = getAllMockData();
                
                if (!allMockData[type]) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid mock data type: ${type}`,
                        availableTypes: Object.keys(allMockData)
                    });
                }

                res.status(200).json({
                    success: true,
                    type,
                    data: allMockData[type],
                    availableTypes: Object.keys(allMockData)
                });
            } else {
                // Obtener datos aleatorios
                const randomData = getRandomMockData();
                
                res.status(200).json({
                    success: true,
                    ...randomData,
                    availableTypes: Object.keys(getAllMockData()),
                    note: 'Use ?type=<type> to get specific mock data type'
                });
            }

        } catch (error) {
            logger.error('Error in mock data controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error getting mock data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * GET /api/forms/validate-url
     * Valida si una URL es un formulario de Google válido
     */
    async validateFormUrl(req, res) {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL parameter is required'
                });
            }

            const isValid = isValidGoogleFormUrl(url);
            
            res.status(200).json({
                success: true,
                isValid,
                url,
                message: isValid ? 'Valid Google Forms URL' : 'Invalid Google Forms URL',
                requirements: [
                    'Must start with https://docs.google.com/forms/',
                    'Must contain form ID pattern',
                    'Should end with /viewform or similar'
                ]
            });

        } catch (error) {
            logger.error('Error in URL validation controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error validating URL',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * POST /api/forms/test-submit
     * Realiza una prueba de envío con datos mock
     */
    async testSubmit(req, res) {
        try {
            logger.info('Test form submission request received');

            const { formUrl, mockType } = req.body;

            // Validar URL
            if (!formUrl || !isValidGoogleFormUrl(formUrl)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid Google Forms URL is required'
                });
            }

            // Verificar sesión
            if (!sessionService.hasValidSession()) {
                return res.status(401).json({
                    success: false,
                    message: 'No valid session found. Please login first.'
                });
            }

            // Obtener datos mock
            let mockData;
            if (mockType) {
                const allMockData = getAllMockData();
                mockData = allMockData[mockType];
                if (!mockData) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid mock type: ${mockType}`,
                        availableTypes: Object.keys(allMockData)
                    });
                }
            } else {
                const randomMock = getRandomMockData();
                mockData = randomMock.data;
                mockType = randomMock.type;
            }

            // Realizar envío de prueba
            const result = await puppeteerService.submitGoogleForm(formUrl, mockData);

            logger.info('Test form submission completed', {
                success: result.success,
                mockType,
                filledFields: result.filledFields
            });

            res.status(200).json({
                success: result.success,
                message: `Test submission completed using ${mockType} mock data`,
                details: {
                    formUrl,
                    mockType,
                    mockData,
                    filledFields: result.filledFields,
                    totalDataProvided: result.totalDataProvided,
                    finalUrl: result.finalUrl,
                    submittedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Error in test form submission controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during test submission',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new FormController();
