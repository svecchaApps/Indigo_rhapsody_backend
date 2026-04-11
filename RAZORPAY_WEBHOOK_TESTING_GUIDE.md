# Razorpay Webhook Testing Guide

## Test Webhook Bodies

Use the test bodies from `razorpay_webhook_test_bodies.json` to test your webhook endpoint.

## Important Notes

1. **Webhook Signature**: The webhook handler verifies the signature using `x-razorpay-signature` header
2. **Amount Format**: Amounts are in **paise** (multiply by 100). Example: ₹500 = 50000 paise
3. **Order ID**: Must match an existing `PaymentDetails` record with `paymentMethod: "razorpay"`

## Test Body Examples

### 1. Payment Captured (Success)

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1234567890abcdef",
        "order_id": "order_1234567890abcdef",
        "amount": 50000,
        "currency": "INR",
        "status": "captured",
        "method": "card",
        "created_at": 1699000000
      }
    }
  }
}
```

### 2. Payment Failed

```json
{
  "event": "payment.failed",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1234567890abcdef",
        "order_id": "order_1234567890abcdef",
        "amount": 50000,
        "currency": "INR",
        "status": "failed",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your card was declined."
      }
    }
  }
}
```

### 3. Order Paid

```json
{
  "event": "order.paid",
  "payload": {
    "order": {
      "entity": {
        "id": "order_1234567890abcdef",
        "amount": 50000,
        "currency": "INR",
        "status": "paid",
        "created_at": 1699000000
      }
    }
  }
}
```

## Generating Webhook Signature for Testing

The webhook signature is generated using HMAC SHA256:

```javascript
const crypto = require('crypto');

function generateWebhookSignature(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
}

// Example usage
const testBody = {
  event: "payment.captured",
  payload: { /* ... */ }
};

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const signature = generateWebhookSignature(testBody, secret);
console.log('Signature:', signature);
```

## Testing with cURL

```bash
# Set your webhook secret
export WEBHOOK_SECRET="your_webhook_secret_here"

# Generate signature (requires Node.js)
SIGNATURE=$(node -e "
const crypto = require('crypto');
const body = require('./razorpay_webhook_test_bodies.json');
const secret = process.env.WEBHOOK_SECRET;
const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(body.payment_captured)).digest('hex');
console.log(signature);
")

# Send webhook request
curl -X POST http://localhost:3000/api/payments/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d @razorpay_webhook_test_bodies.json
```

## Testing with Postman

1. **URL**: `POST http://localhost:3000/api/payments/razorpay/webhook`
2. **Headers**:
   - `Content-Type: application/json`
   - `x-razorpay-signature: <generated_signature>`
3. **Body**: Copy one of the test bodies from `razorpay_webhook_test_bodies.json`

### Postman Pre-request Script (to auto-generate signature):

```javascript
const crypto = require('crypto');
const webhookSecret = pm.environment.get('RAZORPAY_WEBHOOK_SECRET');
const body = pm.request.body.raw;

const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(body)
  .digest('hex');

pm.request.headers.add({
  key: 'x-razorpay-signature',
  value: signature
});
```

## Testing with Node.js Script

```javascript
const axios = require('axios');
const crypto = require('crypto');
const testBody = require('./razorpay_webhook_test_bodies.json');

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
const webhookUrl = 'http://localhost:3000/api/payments/razorpay/webhook';

// Generate signature
const bodyString = JSON.stringify(testBody.payment_captured);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(bodyString)
  .digest('hex');

// Send webhook
axios.post(webhookUrl, testBody.payment_captured, {
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature
  }
})
.then(response => {
  console.log('✅ Webhook sent successfully:', response.data);
})
.catch(error => {
  console.error('❌ Error:', error.response?.data || error.message);
});
```

## Prerequisites for Testing

Before testing, ensure:

1. **PaymentDetails Record Exists**: 
   - Create a `PaymentDetails` record with:
     - `orderId`: matching the `order_id` in webhook payload
     - `paymentMethod`: "razorpay"
     - `userId`: valid user ID
     - `cartId`: valid cart ID

2. **Cart Has Address**: 
   - For successful payments, the cart must have complete address:
   - `street`, `city`, `state`, `pincode`

3. **Environment Variables**:
   - `RAZORPAY_WEBHOOK_SECRET`: Your Razorpay webhook secret

## Expected Responses

### Success (Payment Captured)
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": { /* order details */ }
}
```

### Payment Failed
```json
{
  "success": true,
  "message": "Payment failure recorded"
}
```

### Invalid Signature
```json
{
  "success": false,
  "message": "Invalid webhook signature"
}
```

### Payment Not Found
```json
{
  "success": false,
  "message": "Payment record not found"
}
```

## Troubleshooting

1. **Signature Mismatch**: 
   - Ensure you're using the correct `RAZORPAY_WEBHOOK_SECRET`
   - Make sure the body is stringified exactly as sent

2. **Payment Not Found**:
   - Verify the `order_id` in webhook matches a `PaymentDetails.orderId`
   - Check that `paymentMethod` is set to "razorpay"

3. **Cart Address Missing**:
   - Ensure cart has complete address before payment
   - Check cart address fields: `street`, `city`, `state`, `pincode`




