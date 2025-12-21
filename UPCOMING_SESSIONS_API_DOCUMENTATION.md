# Upcoming Sessions API Documentation

## Overview
The Upcoming Sessions API provides users with a dedicated endpoint to view their upcoming stylist booking sessions. This endpoint automatically filters for future bookings and returns dummy data when no actual bookings are available, ensuring a consistent user experience in the stylist app.

## Base URL
```
/api/stylist-booking
```

## Authentication
- **Required**: Valid JWT token with user authentication
- The user ID is automatically extracted from the JWT token

## Endpoint

### Get Upcoming Sessions
**GET** `/upcoming-sessions`

#### Description
Retrieves all upcoming booking sessions for the authenticated user. Only returns bookings that:
- Are scheduled in the future (scheduled date/time is after current time)
- Have status of `pending`, `confirmed`, or `in_progress`
- Are not cancelled

If no upcoming sessions are found, the endpoint returns realistic dummy data to ensure the UI always has content to display.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | Integer | No | 10 | Maximum number of sessions to return |

#### Request Example
```bash
# Using cURL
curl -X GET "http://localhost:5000/api/stylist-booking/upcoming-sessions?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

```javascript
// Using fetch
const response = await fetch('http://localhost:5000/api/stylist-booking/upcoming-sessions?limit=5', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

#### Response Format

##### Success Response (With Actual Data)
```json
{
  "success": true,
  "message": "Upcoming sessions retrieved successfully",
  "data": {
    "upcomingSessions": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "bookingId": "BOOK_1703123456789_abc123def",
        "userId": "507f191e810c19729de860ea",
        "stylistId": {
          "_id": "507f191e810c19729de860eb",
          "stylistName": "Sarah's Fashion Studio",
          "stylistImage": "https://example.com/images/stylist1.jpg",
          "stylistBio": "Professional stylist with 8+ years of experience",
          "stylistCity": "Mumbai",
          "stylistState": "Maharashtra",
          "stylistPhone": "+1234567890",
          "stylistEmail": "sarah.stylist@example.com"
        },
        "bookingType": "consultation",
        "bookingTitle": "Personal Styling Consultation",
        "bookingDescription": "Initial consultation to understand your style preferences",
        "scheduledDate": "2024-01-15T00:00:00.000Z",
        "scheduledTime": "14:00",
        "duration": 60,
        "timezone": "Asia/Kolkata",
        "status": "confirmed",
        "paymentStatus": "completed",
        "paymentAmount": 2000,
        "paymentCurrency": "INR",
        "paymentMethod": "razorpay",
        "videoCallStatus": "not_started",
        "isRescheduled": false,
        "isCancelled": false,
        "scheduledDateTime": "2024-01-15T14:00:00.000Z",
        "hoursUntilBooking": 48,
        "daysUntilBooking": 2,
        "isUpcoming": true,
        "canBeCancelled": true,
        "canBeRescheduled": true,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "totalUpcoming": 1,
    "isDummyData": false
  }
}
```

##### Success Response (Dummy Data - No Bookings Found)
```json
{
  "success": true,
  "message": "Upcoming sessions retrieved successfully (dummy data - no actual bookings found)",
  "data": {
    "upcomingSessions": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "bookingId": "BOOK_1703123456789_abc123def",
        "userId": "507f191e810c19729de860ea",
        "stylistId": {
          "_id": "507f191e810c19729de860ea",
          "stylistName": "Sarah's Fashion Studio",
          "stylistImage": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
          "stylistBio": "Professional stylist with 8+ years of experience",
          "stylistCity": "Mumbai",
          "stylistState": "Maharashtra",
          "stylistPhone": "+1234567890",
          "stylistEmail": "sarah.stylist@example.com"
        },
        "bookingType": "consultation",
        "bookingTitle": "Personal Styling Consultation",
        "bookingDescription": "Initial consultation to understand your style preferences and fashion goals",
        "scheduledDate": "2024-01-17T00:00:00.000Z",
        "scheduledTime": "14:00",
        "duration": 60,
        "timezone": "Asia/Kolkata",
        "status": "confirmed",
        "paymentStatus": "completed",
        "paymentAmount": 2000,
        "paymentCurrency": "INR",
        "paymentMethod": "razorpay",
        "videoCallStatus": "not_started",
        "isRescheduled": false,
        "isCancelled": false,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "bookingId": "BOOK_1703123456790_def456ghi",
        "userId": "507f191e810c19729de860ea",
        "stylistId": {
          "_id": "507f191e810c19729de860eb",
          "stylistName": "Michael's Style Lab",
          "stylistImage": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          "stylistBio": "Award-winning stylist specializing in contemporary fashion",
          "stylistCity": "Delhi",
          "stylistState": "Delhi",
          "stylistPhone": "+1234567891",
          "stylistEmail": "michael.stylist@example.com"
        },
        "bookingType": "styling_session",
        "bookingTitle": "Complete Wardrobe Makeover",
        "bookingDescription": "Full wardrobe consultation and styling session",
        "scheduledDate": "2024-01-22T00:00:00.000Z",
        "scheduledTime": "10:00",
        "duration": 120,
        "timezone": "Asia/Kolkata",
        "status": "confirmed",
        "paymentStatus": "completed",
        "paymentAmount": 5000,
        "paymentCurrency": "INR",
        "paymentMethod": "razorpay",
        "videoCallStatus": "not_started",
        "isRescheduled": false,
        "isCancelled": false,
        "createdAt": "2024-01-12T10:00:00.000Z",
        "updatedAt": "2024-01-12T10:00:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "bookingId": "BOOK_1703123456791_jkl789mno",
        "userId": "507f191e810c19729de860ea",
        "stylistId": {
          "_id": "507f191e810c19729de860ec",
          "stylistName": "Emma's Wardrobe Consulting",
          "stylistImage": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
          "stylistBio": "Expert in wardrobe optimization and sustainable fashion",
          "stylistCity": "Bangalore",
          "stylistState": "Karnataka",
          "stylistPhone": "+1234567892",
          "stylistEmail": "emma.stylist@example.com"
        },
        "bookingType": "makeover",
        "bookingTitle": "Special Event Makeover",
        "bookingDescription": "Complete makeover for upcoming special event",
        "scheduledDate": "2024-01-29T00:00:00.000Z",
        "scheduledTime": "16:00",
        "duration": 90,
        "timezone": "Asia/Kolkata",
        "status": "pending",
        "paymentStatus": "pending",
        "paymentAmount": 3500,
        "paymentCurrency": "INR",
        "paymentMethod": "razorpay",
        "videoCallStatus": "not_started",
        "isRescheduled": false,
        "isCancelled": false,
        "createdAt": "2024-01-14T10:00:00.000Z",
        "updatedAt": "2024-01-14T10:00:00.000Z"
      }
    ],
    "totalUpcoming": 3,
    "isDummyData": true
  }
}
```

##### Error Response
```json
{
  "success": false,
  "message": "Failed to get upcoming sessions",
  "error": "Error message details"
}
```

#### Response Fields

##### Session Object
| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Booking document ID |
| `bookingId` | String | Unique booking identifier |
| `userId` | String | User ID who made the booking |
| `stylistId` | Object | Stylist profile information (populated) |
| `stylistId.stylistName` | String | Name of the stylist |
| `stylistId.stylistImage` | String | Stylist profile image URL |
| `stylistId.stylistBio` | String | Stylist biography |
| `stylistId.stylistCity` | String | Stylist city |
| `stylistId.stylistState` | String | Stylist state |
| `stylistId.stylistPhone` | String | Stylist phone number |
| `stylistId.stylistEmail` | String | Stylist email |
| `bookingType` | String | Type of booking (`consultation`, `styling_session`, `makeover`, `custom`) |
| `bookingTitle` | String | Title of the booking |
| `bookingDescription` | String | Description of the booking |
| `scheduledDate` | Date | Scheduled date of the session |
| `scheduledTime` | String | Scheduled time in HH:MM format (24-hour) |
| `duration` | Number | Duration of the session in minutes |
| `timezone` | String | Timezone for the booking |
| `status` | String | Booking status (`pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `rescheduled`, `no_show`) |
| `paymentStatus` | String | Payment status (`pending`, `processing`, `completed`, `failed`, `refunded`, `partially_refunded`) |
| `paymentAmount` | Number | Payment amount |
| `paymentCurrency` | String | Payment currency (default: INR) |
| `paymentMethod` | String | Payment method used |
| `videoCallStatus` | String | Video call status (`not_started`, `initiated`, `in_progress`, `ended`, `failed`) |
| `isRescheduled` | Boolean | Whether the booking has been rescheduled |
| `isCancelled` | Boolean | Whether the booking has been cancelled |
| `scheduledDateTime` | Date | Combined scheduled date and time (calculated) |
| `hoursUntilBooking` | Number | Hours until the booking (calculated, only in actual data) |
| `daysUntilBooking` | Number | Days until the booking (calculated, only in actual data) |
| `isUpcoming` | Boolean | Always `true` for upcoming sessions (only in actual data) |
| `canBeCancelled` | Boolean | Whether the booking can be cancelled (only in actual data) |
| `canBeRescheduled` | Boolean | Whether the booking can be rescheduled (only in actual data) |
| `createdAt` | Date | When the booking was created |
| `updatedAt` | Date | When the booking was last updated |

##### Response Data Object
| Field | Type | Description |
|-------|------|-------------|
| `upcomingSessions` | Array | Array of upcoming session objects |
| `totalUpcoming` | Number | Total number of upcoming sessions |
| `isDummyData` | Boolean | `true` if dummy data is returned, `false` if actual bookings |

## Filtering Logic

The endpoint automatically filters bookings based on:

1. **User ID**: Only bookings belonging to the authenticated user
2. **Status**: Only bookings with status `pending`, `confirmed`, or `in_progress`
3. **Cancellation**: Excludes cancelled bookings (`isCancelled: false`)
4. **Future Date/Time**: Only bookings scheduled in the future (scheduled date/time > current time)

## Dummy Data

When no upcoming sessions are found, the endpoint returns 3 dummy sessions with:
- Realistic stylist information
- Various booking types (consultation, styling_session, makeover)
- Different scheduled dates (2 days, 7 days, and 14 days from now)
- Different payment statuses (completed and pending)
- Professional images from Unsplash

The dummy data includes a flag `isDummyData: true` in the response to help the frontend distinguish between real and dummy data.

## Frontend Integration

### React Native / Flutter Example

```dart
// Flutter example
Future<void> fetchUpcomingSessions() async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/stylist-booking/upcoming-sessions?limit=10'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final sessions = data['data']['upcomingSessions'];
      final isDummyData = data['data']['isDummyData'];
      
      // Handle sessions
      if (isDummyData) {
        // Show placeholder UI or prompt user to book
        print('No upcoming sessions - showing dummy data');
      } else {
        // Display actual sessions
        print('Found ${sessions.length} upcoming sessions');
      }
    }
  } catch (e) {
    print('Error fetching upcoming sessions: $e');
  }
}
```

### React / JavaScript Example

```javascript
// React example
const fetchUpcomingSessions = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/stylist-booking/upcoming-sessions?limit=10`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    
    if (data.success) {
      const { upcomingSessions, isDummyData } = data.data;
      
      if (isDummyData) {
        // Show placeholder UI or prompt user to book
        console.log('No upcoming sessions - showing dummy data');
      } else {
        // Display actual sessions
        setSessions(upcomingSessions);
      }
    }
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
  }
};
```

## UI Recommendations

### When `isDummyData: true`
- Display a subtle indicator that these are sample sessions
- Show a call-to-action button to "Book Your First Session"
- Use the dummy data to demonstrate the UI layout
- Consider showing a message like "No upcoming sessions yet. Here are some examples:"

### When `isDummyData: false`
- Display the actual sessions normally
- Show booking details, stylist information, and action buttons
- Enable cancellation/rescheduling based on `canBeCancelled` and `canBeRescheduled` flags

## Error Handling

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized - authentication required"
}
```
**Solution**: Ensure a valid JWT token is included in the Authorization header.

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to get upcoming sessions",
  "error": "Error details"
}
```
**Solution**: Check server logs and database connectivity.

## Testing

### Using cURL
```bash
# Get upcoming sessions
curl -X GET "http://localhost:5000/api/stylist-booking/upcoming-sessions?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman
1. Set method to `GET`
2. URL: `http://localhost:5000/api/stylist-booking/upcoming-sessions?limit=5`
3. Headers:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`
4. Send request

## Notes

- The endpoint automatically calculates `scheduledDateTime` by combining `scheduledDate` and `scheduledTime`
- The `hoursUntilBooking` and `daysUntilBooking` fields are only included in actual data responses
- Dummy data sessions are always scheduled in the future (2, 7, and 14 days from the current date)
- The endpoint respects the `limit` parameter for both actual and dummy data
- All times are in 24-hour format (HH:MM)

## Related Endpoints

- `GET /user-bookings` - Get all user bookings (past and future)
- `POST /create` - Create a new booking
- `POST /reschedule/:bookingId` - Reschedule an upcoming session
- `POST /cancel/:bookingId` - Cancel an upcoming session

