/**
 * Test script for Razorpay Webhook
 * 
 * Usage:
 *   node test_razorpay_webhook.js [event_type]
 * 
 * Event types: payment_captured, payment_failed, order_paid
 * 
 * Make sure to set RAZORPAY_WEBHOOK_SECRET and WEBHOOK_URL environment variables
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load test bodies
const testBodies = require('./razorpay_webhook_test_bodies.json');

// Configuration
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/payments/razorpay/webhook';

// Get event type from command line or default to payment_captured
const eventType = process.argv[2] || 'payment_captured';

// Map event types to test body keys
const eventMap = {
  'payment_captured': 'payment_captured',
  'payment_failed': 'payment_failed',
  'order_paid': 'order_paid',
  'minimal_captured': 'minimal_payment_captured',
  'minimal_failed': 'minimal_payment_failed'
};

function generateWebhookSignature(body, secret) {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  return crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('hex');
}

async function testWebhook(eventType) {
  const testBodyKey = eventMap[eventType] || 'payment_captured';
  const testBody = testBodies[testBodyKey];

  if (!testBody) {
    console.error(`❌ Test body not found for event type: ${eventType}`);
    console.log('Available event types:', Object.keys(eventMap).join(', '));
    process.exit(1);
  }

  console.log(`\n🧪 Testing Razorpay Webhook`);
  console.log(`📋 Event Type: ${eventType}`);
  console.log(`🔗 URL: ${WEBHOOK_URL}`);
  console.log(`\n📦 Webhook Payload:`);
  console.log(JSON.stringify(testBody, null, 2));

  // Generate signature
  const signature = generateWebhookSignature(testBody, WEBHOOK_SECRET);
  console.log(`\n🔐 Generated Signature: ${signature}`);

  try {
    console.log(`\n🚀 Sending webhook request...\n`);

    const response = await axios.post(WEBHOOK_URL, testBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      validateStatus: () => true // Don't throw on any status code
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📄 Response Body:`);
    console.log(JSON.stringify(response.data, null, 2));

    if (response.status >= 200 && response.status < 300) {
      console.log(`\n✅ Webhook test completed successfully!`);
    } else {
      console.log(`\n⚠️  Webhook returned non-success status`);
    }
  } catch (error) {
    console.error(`\n❌ Error sending webhook:`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error(`No response received. Is the server running at ${WEBHOOK_URL}?`);
    } else {
      console.error(`Error:`, error.message);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'your_webhook_secret_here') {
    console.error('❌ Please set RAZORPAY_WEBHOOK_SECRET environment variable');
    console.log('Example: RAZORPAY_WEBHOOK_SECRET=your_secret node test_razorpay_webhook.js');
    process.exit(1);
  }

  testWebhook(eventType)
    .then(() => {
      console.log('\n✨ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testWebhook, generateWebhookSignature };




