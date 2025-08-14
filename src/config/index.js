require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    googleForms: {
        formUrl: process.env.GOOGLE_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSexample/viewform'
    },
    session: {
        timeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour
        maxAge: parseInt(process.env.MAX_SESSION_AGE) || 86400000, // 24 hours
        filePath: './sessions/session.json'
    },
    rateLimit: {
        maxRequests: parseInt(process.env.MAX_REQUESTS_PER_WINDOW) || 100,
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000 // 15 minutes
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log'
    },
    puppeteer: {
        headless: process.env.NODE_ENV === 'production',
        defaultViewport: { width: 1366, height: 768 },
        userDataDir: './sessions/chrome-profile'
    }
};