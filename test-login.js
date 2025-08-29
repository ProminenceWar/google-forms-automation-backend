// Script para probar login
const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('🔑 Probando login...');

        const response = await fetch('http://localhost:3000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@fso-automation.com',
                password: 'admin123'
            })
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success && data.data.accessToken) {
            console.log('\n✅ Login exitoso!');
            console.log('Access Token:', data.data.accessToken.substring(0, 50) + '...');

            // Probar acceso a formularios con el token
            console.log('\n🔄 Probando acceso a formularios...');

            const formsResponse = await fetch('http://localhost:3000/api/v1/forms', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.data.accessToken}`
                }
            });

            const formsData = await formsResponse.json();
            console.log('Forms Status:', formsResponse.status);
            console.log('Forms Response:', JSON.stringify(formsData, null, 2));

        } else {
            console.log('❌ Login falló');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLogin();
