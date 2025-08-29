// Script de debug para JWT
require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('./src/config');

console.log('=== JWT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET from env:', process.env.JWT_SECRET ? 'PRESENT' : 'MISSING');
console.log('JWT_REFRESH_SECRET from env:', process.env.JWT_REFRESH_SECRET ? 'PRESENT' : 'MISSING');
console.log('config.jwt.secret:', config.jwt.secret ? 'PRESENT' : 'MISSING');
console.log('config.jwt.refreshSecret:', config.jwt.refreshSecret ? 'PRESENT' : 'MISSING');

// Intentar crear un token
try {
    console.log('\n=== TESTING TOKEN GENERATION ===');

    const testPayload = { id: 'test123' };
    console.log('Payload:', testPayload);
    console.log('Secret length:', config.jwt.secret ? config.jwt.secret.length : 'N/A');

    const token = jwt.sign(testPayload, config.jwt.secret, { expiresIn: '1h' });
    console.log('Token generated successfully:', token.substring(0, 50) + '...');

    // Verificar el token
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('Token verified successfully:', decoded);

} catch (error) {
    console.error('ERROR creating/verifying token:', error.message);
    console.error('Stack:', error.stack);
}
