# Create Order with Razorpay Payment - Request Body

## Endpoint
```
POST /order
```

## Request Body for Razorpay Orders

### Standard Razorpay Order Body

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "Razorpay",
  "address": {
    "street": "123 Main Street, Apartment 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phoneNumber": "+919876543210"
  },
  "notes": "Payment completed via Razorpay - Payment ID: pay_1234567890abcdef, Order ID: order_1234567890abcdef"
}
```

### Minimal Razorpay Order Body

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "razorpay",
  "address": {
    "street": "456 Park Avenue",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001"
  }
}
```

### Complete Razorpay Order with Full Payment Details

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "Razorpay",
  "address": {
    "street": "789 MG Road, Near Metro Station",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "phoneNumber": "+919876543211"
  },
  "notes": "Payment ID: pay_ABC123XYZ, Razorpay Order ID: order_DEF456UVW, Amount: ₹5000, Transaction completed at 2024-01-15 14:30:00"
}
```

## Field Requirements

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | String | MongoDB ObjectId of existing user | `"507f1f77bcf86cd799439011"` |
| `cartId` | String | MongoDB ObjectId of existing cart (must belong to userId) | `"507f1f77bcf86cd799439012"` |
| `paymentMethod` | String | Payment method - use `"Razorpay"` or `"razorpay"` | `"Razorpay"` |
| `address.street` | String | Complete street address | `"123 Main Street"` |
| `address.city` | String | City name | `"Mumbai"` |
| `address.state` | String | State name | `"Maharashtra"` |
| `address.pincode` | String | 6-digit PIN code | `"400001"` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `address.phoneNumber` | String | Phone number (falls back to user's phone if not provided) | `"+919876543210"` |
| `notes` | String | Additional notes - recommended to include Razorpay payment details | `"Payment ID: pay_123..."` |

## Typical Flow for Razorpay Orders

1. **Initiate Payment**: User initiates Razorpay payment
2. **Payment Success**: Razorpay webhook confirms payment
3. **Create Order**: Use this endpoint to create the order

### Example: Creating Order After Razorpay Webhook

When the Razorpay webhook confirms payment, you typically create the order with:

```json
{
  "userId": "{{userId}}",
  "cartId": "{{cartId}}",
  "paymentMethod": "Razorpay",
  "address": {
    "street": "{{street}}",
    "city": "{{city}}",
    "state": "{{state}}",
    "pincode": "{{pincode}}",
    "phoneNumber": "{{phoneNumber}}"
  },
  "notes": "Payment completed via Razorpay - Payment ID: {{razorpayPaymentId}}, Order ID: {{razorpayOrderId}}"
}
```

## Testing with cURL

```bash
curl -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "cartId": "507f1f77bcf86cd799439012",
    "paymentMethod": "Razorpay",
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "phoneNumber": "+919876543210"
    },
    "notes": "Payment completed via Razorpay - Payment ID: pay_1234567890, Order ID: order_1234567890"
  }'
```

## Testing with Postman

1. **Method**: `POST`
2. **URL**: `http://localhost:3000/order`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body** (raw JSON): Use any of the examples above

## Response

### Success Response (201 Created)

```json
{
  "message": "Order created successfully, email sent, and notifications created.",
  "order": {
    "_id": "507f1f77bcf86cd799439013",
    "userId": "507f1f77bcf86cd799439011",
    "cartId": "507f1f77bcf86cd799439012",
    "orderId": "ORD-1699000000000",
    "amount": 5000,
    "paymentMethod": "Razorpay",
    "products": [
      {
        "productId": "...",
        "productName": "Product Name",
        "quantity": 2,
        "price": 2500,
        ...
      }
    ],
    "shippingDetails": {
      "address": {
        "street": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "country": "India"
      },
      "phoneNumber": "+919876543210"
    },
    "notes": "Payment completed via Razorpay - Payment ID: pay_1234567890, Order ID: order_1234567890",
    "status": "pending",
    "createdAt": "2024-01-15T14:30:00.000Z",
    ...
  }
}
```

## Important Notes for Razorpay Orders

1. **Payment Verification**: Ensure Razorpay payment is verified before creating the order
2. **Cart Must Exist**: The cart must exist and belong to the userId
3. **Cart Must Have Products**: The cart should contain products with calculated totals
4. **Payment Method**: Use `"Razorpay"` or `"razorpay"` (case-insensitive)
5. **Notes Field**: It's recommended to include Razorpay payment details in the notes field for reference:
   - Payment ID
   - Razorpay Order ID
   - Transaction amount
   - Transaction timestamp

## Integration with Razorpay Webhook

When the Razorpay webhook confirms payment, the webhook handler typically calls `createOrder` with:

```javascript
const orderRequest = {
  body: {
    userId: payment.userId,
    cartId: payment.cartId,
    paymentMethod: "Razorpay",
    address: address,
    notes: `Payment completed via Razorpay - Payment ID: ${razorpayPaymentId}, Order ID: ${razorpayOrderId}`
  }
};

await createOrder(orderRequest, res);
```

## Prerequisites

Before creating a Razorpay order:
- ✅ User exists in database
- ✅ Cart exists and belongs to the user
- ✅ Cart contains products
- ✅ Razorpay payment is verified/completed
- ✅ Address information is available




