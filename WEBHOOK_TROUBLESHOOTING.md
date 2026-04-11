# Razorpay Webhook "Missing Signature" Error - Troubleshooting

## Error Message
```json
{
    "success": false,
    "message": "Missing webhook signature"
}
```

## Common Causes & Solutions

### 1. **Header Not Sent in Request**

**Problem**: The `x-razorpay-signature` header is not being included in your request.

**Solution**: Make sure you're sending the header with your request:

#### Using cURL:
```bash
curl -X POST http://localhost:3000/api/payments/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: YOUR_SIGNATURE_HERE" \
  -d '{"event":"payment.captured","payload":{...}}'
```

#### Using Postman:
1. Go to **Headers** tab
2. Add header:
   - **Key**: `x-razorpay-signature`
   - **Value**: `YOUR_GENERATED_SIGNATURE`
3. Make sure the header is **enabled** (checkbox checked)

#### Using Node.js/axios:
```javascript
axios.post(url, body, {
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature  // ← Make sure this is included!
  }
});
```

### 2. **Header Name Case Sensitivity**

**Problem**: Some HTTP clients or proxies might modify header names.

**Solution**: The code now checks multiple header name variations. But ensure you're sending it as:
- `x-razorpay-signature` (lowercase, recommended)

### 3. **Testing Without Signature**

**Problem**: You're testing manually without generating/sending the signature.

**Solution**: Use the provided test scripts:

```bash
# Set your webhook secret
export RAZORPAY_WEBHOOK_SECRET="your_secret_here"

# Run the quick test
node quick_webhook_test.js

# Or use the full test script
node test_razorpay_webhook.js payment_captured
```

### 4. **Middleware Stripping Headers**

**Problem**: Some middleware might be removing custom headers.

**Solution**: Check your Express middleware configuration. The webhook route should be accessible without any middleware that modifies headers.

### 5. **Proxy/Reverse Proxy Issues**

**Problem**: If behind a proxy (nginx, Apache, etc.), it might not forward custom headers.

**Solution**: Configure your proxy to forward the `x-razorpay-signature` header:

**Nginx example:**
```nginx
location /api/payments/razorpay/webhook {
    proxy_pass http://localhost:3000;
    proxy_set_header x-razorpay-signature $http_x_razorpay_signature;
    proxy_set_header Content-Type $http_content_type;
}
```

## Quick Debug Steps

1. **Check Server Logs**: The updated code now logs all received headers. Check your server console for:
   ```
   📋 Request Headers: {...}
   ```

2. **Verify Header is Sent**: Use the quick test script:
   ```bash
   node quick_webhook_test.js
   ```

3. **Check Environment Variable**: Make sure `RAZORPAY_WEBHOOK_SECRET` is set:
   ```bash
   echo $RAZORPAY_WEBHOOK_SECRET
   ```

4. **Test with Postman**: 
   - Use the test body from `razorpay_webhook_test_bodies.json`
   - Generate signature using the script
   - Add header manually in Postman

## Signature Generation

The signature must be generated using HMAC SHA256:

```javascript
const crypto = require('crypto');

function generateSignature(body, secret) {
  const bodyString = typeof body === 'string' 
    ? body 
    : JSON.stringify(body);
  
  return crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('hex');
}

// Usage
const body = { event: "payment.captured", payload: {...} };
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const signature = generateSignature(body, secret);
```

## Testing Checklist

- [ ] `RAZORPAY_WEBHOOK_SECRET` environment variable is set
- [ ] Header `x-razorpay-signature` is included in request
- [ ] Signature is generated using the exact body being sent
- [ ] Server is running and accessible
- [ ] No middleware is stripping the header
- [ ] Proxy (if any) is forwarding the header

## Still Having Issues?

1. Check server logs for the "📋 Request Headers" output
2. Compare the headers you're sending vs. what the server receives
3. Try the `quick_webhook_test.js` script to verify your setup
4. Ensure the webhook URL is correct: `/api/payments/razorpay/webhook`




