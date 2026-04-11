/**
 * Quick test script to verify webhook signature header is being sent
 * Run: node quick_webhook_test.js
 */

const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/payments/razorpay/webhook';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret_123';

const testBody = {
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_test123",
        order_id: "order_test123",
        amount: 50000,
        currency: "INR",
        status: "captured",
        method: "card",
        created_at: 1699000000
      }
    }
  }
};

// Generate signature
const bodyString = JSON.stringify(testBody);
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(bodyString)
  .digest('hex');

console.log('🧪 Quick Webhook Test');
console.log('====================');
console.log('URL:', WEBHOOK_URL);
console.log('Body:', JSON.stringify(testBody, null, 2));
console.log('Signature:', signature);
console.log('Header to send: x-razorpay-signature:', signature);
console.log('\n🚀 Sending request...\n');

axios.post(WEBHOOK_URL, testBody, {
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature  // Make sure this header is set!
  },
  validateStatus: () => true
})
.then(response => {
  console.log('✅ Response received:');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.data.message === 'Missing webhook signature') {
    console.log('\n❌ ERROR: Header not received by server!');
    console.log('Check:');
    console.log('1. Is the header name exactly "x-razorpay-signature"?');
    console.log('2. Is your server running?');
    console.log('3. Check server logs for received headers');
  }
})
.catch(error => {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
});




