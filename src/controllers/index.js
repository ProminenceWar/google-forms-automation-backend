/**
 * @fileoverview Índice de controladores
 * @description Exporta todos los controladores de la aplicación
 */

const formController = require('./formController');
const sessionController = require('./sessionController');
const dashboardController = require('./dashboardController');
const exportController = require('./exportController');
const configController = require('./configController');
const reportsController = require('./reportsController');

module.exports = {
    formController,
    sessionController,
    dashboardController,
    exportController,
    configController,
    reportsController
};
