# Create Order API - Request Body Guide

## Endpoint
```
POST /order
```

## Required Fields

### 1. `userId` (String, Required)
- MongoDB ObjectId of the user placing the order
- Must be a valid existing User ID
- Example: `"507f1f77bcf86cd799439011"`

### 2. `cartId` (String, Required)
- MongoDB ObjectId of the cart to convert to order
- Must be a valid existing Cart ID that belongs to the userId
- Example: `"507f1f77bcf86cd799439012"`

### 3. `paymentMethod` (String, Required)
- Payment method used for the order
- Case-insensitive
- Supported values: `"cod"`, `"Razorpay"`, `"razorpay"`, `"Phonepe"`, `"phonepe"`, `"stripe"`, `"paypal"`
- Example: `"cod"` or `"Razorpay"`

### 4. `address` (Object, Required)
Address object with the following required fields:

#### Required Address Fields:
- `street` (String) - Street address
- `city` (String) - City name
- `state` (String) - State name
- `pincode` (String) - 6-digit PIN code

#### Optional Address Fields:
- `phoneNumber` (String) - Phone number (falls back to user's phoneNumber if not provided)

## Optional Fields

### `notes` (String, Optional)
- Additional notes or comments for the order
- Example: `"Please deliver before 6 PM"` or `"Payment completed via Razorpay"`

## Example Request Bodies

### Example 1: Cash on Delivery (COD)
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "cod",
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phoneNumber": "+919876543210"
  },
  "notes": "Please deliver before 6 PM"
}
```

### Example 2: Razorpay Payment
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "Razorpay",
  "address": {
    "street": "456 Park Avenue",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "phoneNumber": "+919876543211"
  },
  "notes": "Payment completed via Razorpay - Payment ID: pay_1234567890, Order ID: order_1234567890"
}
```

### Example 3: PhonePe Payment
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "Phonepe",
  "address": {
    "street": "789 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "phoneNumber": "+919876543212"
  },
  "notes": "Payment completed via PhonePe"
}
```

### Example 4: Minimal Request (No Notes, No Phone Number)
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "cartId": "507f1f77bcf86cd799439012",
  "paymentMethod": "cod",
  "address": {
    "street": "123 Test Street",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001"
  }
}
```

## Testing with cURL

```bash
curl -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "cartId": "507f1f77bcf86cd799439012",
    "paymentMethod": "cod",
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "phoneNumber": "+919876543210"
    },
    "notes": "Please deliver before 6 PM"
  }'
```

## Testing with Postman

1. **Method**: POST
2. **URL**: `http://localhost:3000/order`
3. **Headers**: 
   - `Content-Type: application/json`
4. **Body** (raw JSON): Use any of the example bodies above

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
    "paymentMethod": "cod",
    "products": [...],
    "shippingDetails": {...},
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    ...
  }
}
```

### Error Responses

#### 404 - User Not Found
```json
{
  "message": "User not found"
}
```

#### 404 - Cart Not Found
```json
{
  "message": "Cart not found"
}
```

#### 400 - Invalid Address
```json
{
  "message": "Invalid or missing address details"
}
```

#### 500 - Server Error
```json
{
  "message": "Error creating order",
  "error": "Error message details"
}
```

## Important Notes

1. **Cart Must Exist**: The cartId must reference an existing cart that belongs to the userId
2. **Cart Must Have Products**: The cart should contain products before creating an order
3. **Cart Will Be Cleared**: After order creation, the cart products will be cleared
4. **Invoice Generated**: An invoice will be automatically generated and uploaded to Firebase
5. **Email Notifications**: 
   - Confirmation email sent to customer
   - Notification emails sent to designers
6. **FCM Notification**: Push notification sent if user has FCM token

## Prerequisites

Before creating an order, ensure:
- ✅ User exists in database
- ✅ Cart exists and belongs to the user
- ✅ Cart contains products
- ✅ Cart has calculated totals (total_amount, tax_amount, shipping_cost, etc.)




