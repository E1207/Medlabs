
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

async function testAnalytics() {
    console.log('--- Testing Analytics Endpoint ---');

    // 1. Login as Lab Admin
    console.log('Logging in as Lab Admin...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'lab@medlab.cm', password: 'pass123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const { access_token } = await loginRes.json();
    console.log('Login successful. Token obtained.');

    // 2. Fetch Analytics Summary
    console.log('Fetching /analytics/summary...');
    const analyticsRes = await fetch(`${API_URL}/analytics/summary`, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    });

    if (!analyticsRes.ok) {
        console.error('Analytics fetch failed:', analyticsRes.status, await analyticsRes.text());
        return;
    }

    const data = await analyticsRes.json();
    console.log('Analytics Data:', JSON.stringify(data, null, 2));
}

testAnalytics();
