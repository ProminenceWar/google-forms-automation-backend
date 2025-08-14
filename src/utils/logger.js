const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure logs directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'google-forms-automation' },
    transports: [
        new winston.transports.File({
            filename: config.logging.file.replace('.log', '-error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: config.logging.file
        })
    ]
});

// If we're not in production, log to console too
if (config.server.nodeEnv !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;