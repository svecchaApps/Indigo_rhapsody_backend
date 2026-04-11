# Stylist Booking Flow Documentation

## Overview
This document describes the complete booking flow for stylist appointments, including slot selection, Razorpay payment integration, and notification system.

## Base URL
```
/api/stylist-booking
```

## Complete Booking Flow

### Step 1: Book from Selected Slot
**POST** `/book-from-slot`

#### Description
Creates a booking from a selected time slot. Validates slot availability, creates the booking, and initiates Razorpay payment immediately.

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes* | User ID (MongoDB ObjectId) |
| `stylistId` | String | Yes | Stylist profile ID |
| `slotDate` | String | Yes | Date in YYYY-MM-DD format |
| `slotStartTime` | String | Yes | Start time in HH:MM format (24-hour) |
| `slotEndTime` | String | No | End time in HH:MM format (optional, calculated if not provided) |
| `bookingType` | String | No | Type of booking (default: "consultation") |
| `bookingTitle` | String | Yes | Title of the booking |
| `bookingDescription` | String | Yes | Description of the booking |
| `duration` | Number | No | Duration in minutes (default: from slot or 60) |

*Required if not authenticated

#### Request Example
```bash
curl -X POST "http://localhost:5000/api/stylist-booking/book-from-slot" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f191e810c19729de860ea",
    "stylistId": "507f1f77bcf86cd799439011",
    "slotDate": "2024-01-20",
    "slotStartTime": "13:00",
    "slotEndTime": "13:30",
    "bookingType": "consultation",
    "bookingTitle": "Personal Styling Consultation",
    "bookingDescription": "Looking for advice on wardrobe styling",
    "duration": 30
  }'
```

#### Response Example
```json
{
  "success": true,
  "message": "Booking created. Please complete payment to confirm.",
  "data": {
    "booking": {
      "_id": "507f1f77bcf86cd799439020",
      "bookingId": "BOOK_1703123456789_abc123def",
      "bookingType": "consultation",
      "bookingTitle": "Personal Styling Consultation",
      "scheduledDate": "2024-01-20T00:00:00.000Z",
      "scheduledTime": "13:00",
      "duration": 30,
      "paymentAmount": 2000,
      "status": "pending",
      "paymentStatus": "processing"
    },
    "payment": {
      "orderId": "order_ABC123XYZ",
      "amount": 2000,
      "currency": "INR",
      "paymentOptions": {
        "key": "rzp_test_...",
        "amount": 200000,
        "currency": "INR",
        "name": "IndigoRhapsody",
        "description": "Stylist Booking - Personal Styling Consultation",
        "order_id": "order_ABC123XYZ",
        "prefill": {
          "name": "John Doe",
          "email": "john@example.com",
          "contact": "+1234567890"
        },
        "theme": {
          "color": "#3399cc"
        }
      },
      "expiresIn": 1800
    }
  }
}
```

#### Slot Validation
- Validates that the slot exists in the stylist's availability
- Checks if slot is available (`isAvailable: true`)
- Verifies slot hasn't reached `maxBookings` limit
- Ensures user doesn't already have a booking at the same time
- Validates time format (HH:MM, 24-hour)

---

### Step 2: Complete Razorpay Payment

After receiving the payment options, the frontend should:
1. Initialize Razorpay checkout with the provided `paymentOptions`
2. Handle payment success/failure
3. Call the payment callback endpoint with payment details

#### Frontend Integration (JavaScript)
```javascript
const options = {
  key: paymentOptions.key,
  amount: paymentOptions.amount,
  currency: paymentOptions.currency,
  name: paymentOptions.name,
  description: paymentOptions.description,
  order_id: paymentOptions.order_id,
  prefill: paymentOptions.prefill,
  handler: async function (response) {
    // Call payment callback endpoint
    const callbackResponse = await fetch('/api/stylist-booking/payment/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });
    
    const result = await callbackResponse.json();
    if (result.success) {
      // Booking confirmed!
      console.log('Booking confirmed:', result.data);
    }
  },
  modal: {
    ondismiss: function() {
      // Payment cancelled
      console.log('Payment cancelled');
    }
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

---

### Step 3: Payment Callback
**POST** `/payment/callback`

#### Description
Handles Razorpay payment callback, verifies payment signature, confirms booking, and sends notifications.

#### Request Body
```json
{
  "razorpay_order_id": "order_ABC123XYZ",
  "razorpay_payment_id": "pay_DEF456UVW",
  "razorpay_signature": "signature_hash_here"
}
```

#### Response Example
```json
{
  "success": true,
  "message": "Payment completed successfully. Booking confirmed.",
  "data": {
    "bookingId": "507f1f77bcf86cd799439020",
    "paymentStatus": "completed",
    "bookingStatus": "confirmed",
    "paymentId": "pay_DEF456UVW"
  }
}
```

#### What Happens After Payment
1. Payment signature is verified
2. Booking status changes to `confirmed`
3. Payment status changes to `completed`
4. User receives confirmation notification
5. Stylist receives new booking notification
6. **30-minute reminder notification is scheduled**

---

### Step 4: Get User Bookings
**GET** `/user-bookings`

#### Description
Retrieves all bookings for a user. Works with or without authentication.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | String | Yes* | User ID (if not authenticated) |
| `page` | Number | No | Page number (default: 1) |
| `limit` | Number | No | Results per page (default: 10) |
| `status` | String | No | Filter by status (pending, confirmed, completed, cancelled) |

*Required if not authenticated

#### Request Example
```bash
# With userId parameter
curl -X GET "http://localhost:5000/api/stylist-booking/user-bookings?userId=507f191e810c19729de860ea&page=1&limit=10"

# With authentication
curl -X GET "http://localhost:5000/api/stylist-booking/user-bookings?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response Example
```json
{
  "success": true,
  "message": "User bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "bookingId": "BOOK_1703123456789_abc123def",
        "userId": {
          "_id": "507f191e810c19729de860ea",
          "displayName": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890"
        },
        "stylistId": {
          "_id": "507f1f77bcf86cd799439011",
          "stylistName": "Sarah Fashion Studio",
          "stylistImage": "https://example.com/image.jpg",
          "stylistBio": "Professional stylist...",
          "stylistCity": "Mumbai",
          "stylistState": "Maharashtra"
        },
        "bookingType": "consultation",
        "bookingTitle": "Personal Styling Consultation",
        "scheduledDate": "2024-01-20T00:00:00.000Z",
        "scheduledTime": "13:00",
        "duration": 30,
        "status": "confirmed",
        "paymentStatus": "completed",
        "paymentAmount": 2000,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalBookings": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## Notification System

### Automatic Notifications

#### 1. Booking Confirmation (Immediate)
- **Trigger**: After successful payment
- **Recipient**: User
- **Message**: "Your booking with [Stylist Name] has been confirmed for [Date] at [Time]."

#### 2. New Booking Notification (Immediate)
- **Trigger**: After successful payment
- **Recipient**: Stylist
- **Message**: "You have a new booking from [User Name] on [Date] at [Time]."

#### 3. Booking Reminder (30 Minutes Before)
- **Trigger**: 30 minutes before scheduled booking time
- **Recipient**: User
- **Message**: "Your booking with [Stylist Name] is in 30 minutes at [Time]."
- **Note**: Only sent if booking is still confirmed and not cancelled

### Notification Delivery
- **FCM Push Notifications**: Sent to user's FCM token (if available)
- **In-App Notifications**: Stored in database for in-app display
- **Automatic Scheduling**: Reminder notifications are automatically scheduled when booking is confirmed

---

## Error Handling

### Common Errors

#### Slot Not Available
```json
{
  "success": false,
  "message": "Selected slot (13:00) is not available"
}
```

#### Slot Fully Booked
```json
{
  "success": false,
  "message": "This slot is fully booked"
}
```

#### Invalid Payment Signature
```json
{
  "success": false,
  "message": "Invalid payment signature"
}
```

#### Booking Not Found
```json
{
  "success": false,
  "message": "Booking not found for this payment"
}
```

---

## Complete Flow Diagram

```
1. User selects slot
   ↓
2. POST /book-from-slot
   - Validates slot availability
   - Creates booking (status: pending)
   - Creates Razorpay order
   - Returns payment options
   ↓
3. Frontend: Initialize Razorpay checkout
   ↓
4. User completes payment
   ↓
5. POST /payment/callback
   - Verifies payment signature
   - Updates booking (status: confirmed)
   - Sends confirmation notifications
   - Schedules 30-minute reminder
   ↓
6. 30 minutes before booking
   - Reminder notification sent to user
   ↓
7. GET /user-bookings
   - User can view all their bookings
```

---

## Frontend Integration Guide

### React Native / Flutter Example

```dart
// 1. Book from slot
Future<Map<String, dynamic>> bookFromSlot({
  required String userId,
  required String stylistId,
  required String slotDate,
  required String slotStartTime,
  required String bookingTitle,
  required String bookingDescription,
}) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/stylist-booking/book-from-slot'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'userId': userId,
      'stylistId': stylistId,
      'slotDate': slotDate,
      'slotStartTime': slotStartTime,
      'bookingTitle': bookingTitle,
      'bookingDescription': bookingDescription,
    }),
  );

  final data = json.decode(response.body);
  if (data['success']) {
    // Initialize Razorpay with payment options
    final paymentOptions = data['data']['payment']['paymentOptions'];
    await initializeRazorpay(paymentOptions);
  }
  return data;
}

// 2. Handle payment callback
Future<void> handlePaymentCallback({
  required String orderId,
  required String paymentId,
  required String signature,
}) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/stylist-booking/payment/callback'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'razorpay_order_id': orderId,
      'razorpay_payment_id': paymentId,
      'razorpay_signature': signature,
    }),
  );

  final data = json.decode(response.body);
  if (data['success']) {
    // Show success message
    print('Booking confirmed!');
  }
}

// 3. Get user bookings
Future<List<dynamic>> getUserBookings(String userId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/stylist-booking/user-bookings?userId=$userId'),
  );

  final data = json.decode(response.body);
  if (data['success']) {
    return data['data']['bookings'];
  }
  return [];
}
```

---

## Testing

### Test Complete Flow

```bash
# 1. Book from slot
curl -X POST "http://localhost:5000/api/stylist-booking/book-from-slot" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f191e810c19729de860ea",
    "stylistId": "507f1f77bcf86cd799439011",
    "slotDate": "2024-01-20",
    "slotStartTime": "13:00",
    "bookingTitle": "Test Booking",
    "bookingDescription": "Test description"
  }'

# 2. Complete payment (use Razorpay test credentials)
# Frontend handles this

# 3. Payment callback (after payment)
curl -X POST "http://localhost:5000/api/stylist-booking/payment/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_test123",
    "razorpay_payment_id": "pay_test123",
    "razorpay_signature": "signature_test123"
  }'

# 4. Get user bookings
curl -X GET "http://localhost:5000/api/stylist-booking/user-bookings?userId=507f191e810c19729de860ea"
```

---

## Notes

- **Slot Validation**: The system validates slots against the stylist's availability schedule
- **Payment Integration**: Razorpay payment is initiated immediately when booking is created
- **Automatic Reminders**: 30-minute reminder notifications are automatically scheduled
- **Payment Expiry**: Payment orders expire after 30 minutes (1800 seconds)
- **Booking Status**: Bookings start as `pending` and change to `confirmed` after payment
- **User Identification**: Endpoints work with or without authentication (use `userId` parameter)

