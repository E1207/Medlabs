const fetch = require('node-fetch');

async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/results', {
            headers: {
                // We need a valid token to bypass JwtAuthGuard
                'Authorization': 'Bearer ' + process.env.TEST_TOKEN
            }
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
