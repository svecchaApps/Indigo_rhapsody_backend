# Razorpay Webhook Setup Guide

## Overview

There are **two different endpoints** for handling Razorpay payments, each using different credentials:

1. **Payment Callback** (`/payment/callback`) - From frontend after user completes payment
2. **Razorpay Webhook** (`/payment/webhook`) - Server-to-server from Razorpay

---

## 1. Payment Callback (Frontend)

### Endpoint
```
POST /api/stylist-booking/payment/callback
```

### When It's Called
- Called by your **frontend application** after user completes payment
- User clicks "Pay" → Razorpay checkout → Payment success → Frontend calls this endpoint

### Credentials Used
- **`RAZORPAY_KEY_SECRET`** - Used to verify the payment signature

### Request Body
```json
{
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_DEF456",
  "razorpay_signature": "signature_hash"
}
```

### Signature Verification
The signature is verified using:
```javascript
const body = razorpay_order_id + "|" + razorpay_payment_id;
const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
```

### Environment Variable Required
```env
RAZORPAY_KEY_SECRET=your_key_secret_here
```

---

## 2. Razorpay Webhook (Server-to-Server)

### Endpoint
```
POST /api/stylist-booking/payment/webhook
```

### When It's Called
- Called **directly by Razorpay servers** when payment events occur
- Automatically triggered by Razorpay (not by your frontend)
- More reliable for production use

### Credentials Used
- **`RAZORPAY_WEBHOOK_SECRET`** (preferred) - Webhook secret from Razorpay dashboard
- **`RAZORPAY_KEY_SECRET`** (fallback) - Used if webhook secret is not set

### Request Headers
```
X-Razorpay-Signature: webhook_signature_hash
Content-Type: application/json
```

### Request Body (from Razorpay)
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_DEF456",
        "order_id": "order_ABC123",
        "amount": 200000,
        "currency": "INR",
        "status": "captured",
        "method": "card"
      }
    }
  }
}
```

### Signature Verification
The webhook signature is verified using:
```javascript
const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
    .update(rawBody)  // Raw request body (not parsed JSON)
    .digest("hex");
```

### Environment Variables Required
```env
# Preferred: Use webhook secret (more secure)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Fallback: Key secret (works but less secure)
RAZORPAY_KEY_SECRET=your_key_secret_here
```

---

## Setting Up Razorpay Webhook

### Step 1: Get Webhook Secret from Razorpay Dashboard

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **Webhooks**
3. Click **Add New Webhook**
4. Configure:
   - **URL**: `https://yourdomain.com/api/stylist-booking/payment/webhook`
   - **Active Events**: 
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
5. Click **Create Webhook**
6. Copy the **Webhook Secret** (shown only once)

### Step 2: Add Webhook Secret to Environment Variables

```env
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_KEY_ID=your_key_id_here
```

### Step 3: Test Webhook

Razorpay provides a webhook testing tool:
1. Go to **Settings** → **Webhooks**
2. Click on your webhook
3. Click **Send Test Webhook**
4. Check your server logs to verify it's received

---

## Webhook Events Handled

### 1. `payment.captured`
- **When**: Payment is successfully captured
- **Action**: 
  - Updates booking status to `confirmed`
  - Updates payment status to `completed`
  - Sends confirmation notifications
  - Schedules 30-minute reminder

### 2. `payment.failed`
- **When**: Payment fails
- **Action**:
  - Updates payment status to `failed`
  - Sends failure notification to user

### 3. `order.paid`
- **When**: Order is marked as paid
- **Action**:
  - Backup confirmation if `payment.captured` wasn't received
  - Updates booking status

---

## Important Notes

### 1. Raw Body Requirement
The webhook endpoint uses `express.raw()` middleware to get the raw request body for signature verification. This is **required** for proper signature verification.

### 2. Signature Verification
- **Always verify webhook signatures** - Never trust unverified webhooks
- The signature is in the `X-Razorpay-Signature` header
- Use the **webhook secret** (not key secret) for verification

### 3. Idempotency
- Webhooks may be sent multiple times
- The code checks if booking is already confirmed before updating
- This prevents duplicate processing

### 4. Response Status
- Always return `200 OK` to Razorpay (even if processing fails)
- Razorpay will retry if you return an error status
- Log errors internally instead

### 5. Production vs Development
- **Development**: Use test webhook secret from Razorpay test mode
- **Production**: Use production webhook secret from Razorpay live mode
- Update webhook URL when deploying to production

---

## Testing

### Test Payment Callback (Frontend)
```bash
curl -X POST "http://localhost:5000/api/stylist-booking/payment/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_test123",
    "razorpay_payment_id": "pay_test123",
    "razorpay_signature": "test_signature"
  }'
```

### Test Webhook (Server-to-Server)
```bash
# Note: This requires a valid webhook signature from Razorpay
# Use Razorpay dashboard's "Send Test Webhook" feature instead
curl -X POST "http://localhost:5000/api/stylist-booking/payment/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_test123",
          "amount": 200000,
          "currency": "INR",
          "status": "captured"
        }
      }
    }
  }'
```

---

## Troubleshooting

### Issue: "Invalid webhook signature"
**Solution**: 
- Check that `RAZORPAY_WEBHOOK_SECRET` is set correctly
- Verify the webhook secret matches the one in Razorpay dashboard
- Ensure raw body is being used (not parsed JSON)

### Issue: Webhook not received
**Solution**:
- Check webhook URL is accessible (not behind firewall)
- Verify webhook is active in Razorpay dashboard
- Check server logs for incoming requests
- Ensure HTTPS is enabled (Razorpay requires HTTPS in production)

### Issue: "Missing X-Razorpay-Signature header"
**Solution**:
- Ensure Razorpay is sending the header
- Check if reverse proxy is stripping headers
- Verify webhook URL is correct in Razorpay dashboard

---

## Security Best Practices

1. **Always verify signatures** - Never process unverified webhooks
2. **Use webhook secret** - More secure than key secret
3. **HTTPS only** - Razorpay requires HTTPS in production
4. **Idempotent processing** - Handle duplicate webhooks gracefully
5. **Log everything** - Keep logs of all webhook events for debugging

---

## Summary

| Feature | Payment Callback | Razorpay Webhook |
|---------|-----------------|------------------|
| **Called by** | Frontend | Razorpay servers |
| **Credential** | `RAZORPAY_KEY_SECRET` | `RAZORPAY_WEBHOOK_SECRET` |
| **Signature** | In request body | In `X-Razorpay-Signature` header |
| **Body format** | Parsed JSON | Raw body (for verification) |
| **Reliability** | Depends on frontend | More reliable (server-to-server) |
| **Use case** | Immediate user feedback | Production payment confirmation |

**Recommendation**: Use **both** endpoints:
- **Payment Callback** for immediate user feedback
- **Razorpay Webhook** for reliable payment confirmation in production

