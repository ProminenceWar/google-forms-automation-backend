// formController.js
// Controlador para manejo de formularios

const puppeteerService = require('../services/puppeteerService');
const sessionService = require('../services/sessionService');
const { FSOForm } = require('../models');
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
     * GET /api/forms/sample-data
     * Obtiene datos de muestra desde MongoDB
     */
    async getSampleData(req, res) {
        try {
            logger.info('Sample data request received');

            // Obtener formularios de muestra desde MongoDB
            const sampleForms = await FSOForm.find()
                .limit(5)
                .sort({ fechaCreacion: -1 })
                .select('numeroOrden tipoFSO companiaInspeccion nombreTecnico estado fechaCreacion');

            if (sampleForms.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No sample data found in database',
                    suggestion: 'Run the insertSampleData script to populate sample data'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Sample data retrieved successfully',
                data: sampleForms,
                count: sampleForms.length
            });

        } catch (error) {
            logger.error('Error in sample data controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error getting sample data',
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

            // Obtener datos de muestra desde MongoDB
            let sampleData;
            if (mockType) {
                // Buscar un formulario específico por tipo
                const sampleForm = await FSOForm.findOne({ tipoFSO: mockType });
                if (!sampleForm) {
                    return res.status(400).json({
                        success: false,
                        message: `No sample data found for type: ${mockType}`,
                        suggestion: 'Run the insertSampleData script to populate sample data'
                    });
                }
                sampleData = sampleForm.toFormData();
            } else {
                // Obtener un formulario aleatorio
                const randomForm = await FSOForm.aggregate([{ $sample: { size: 1 } }]);
                if (randomForm.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'No sample data found in database',
                        suggestion: 'Run the insertSampleData script to populate sample data'
                    });
                }
                sampleData = randomForm[0];
                mockType = sampleData.tipoFSO;
            }

            // Realizar envío de prueba
            const result = await puppeteerService.submitGoogleForm(formUrl, sampleData);

            logger.info('Test form submission completed', {
                success: result.success,
                sampleType: mockType,
                filledFields: result.filledFields
            });

            res.status(200).json({
                success: result.success,
                message: `Test submission completed using ${mockType} sample data`,
                details: {
                    formUrl,
                    sampleType: mockType,
                    sampleData,
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
