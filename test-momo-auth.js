// test-momo-auth.js
require('dotenv').config();

const BASE_URL = process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
const CONSUMER_KEY = process.env.MTN_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MTN_CONSUMER_SECRET;
const COLLECTION_KEY = process.env.MTN_COLLECTION_KEY;
const TARGET_ENV = process.env.MTN_MOMO_ENV || "sandbox";

async function testToken() {
  console.log(`Testing with Base URL: ${BASE_URL}`);
  const creds = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  
  try {
    const res = await fetch(`${BASE_URL}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Ocp-Apim-Subscription-Key': COLLECTION_KEY,
        'X-Target-Environment': TARGET_ENV,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Token error ${res.status}: ${body}`);
    }
    const data = await res.json();
    console.log('✅ SUCCESS: Access token generated successfully.');
    console.log('Token expires in:', data.expires_in, 'seconds');
  } catch (error) {
    console.error('❌ ERROR: Failed to generate access token.');
    console.error(error.message);
  }
}

testToken();