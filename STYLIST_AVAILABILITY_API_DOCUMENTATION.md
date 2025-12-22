# Stylist Availability API Documentation

## Overview
The Stylist Availability API allows stylists to create and manage their availability schedules, including weekly schedules, date-specific overrides, and booking preferences. The API also provides endpoints to fetch availability along with stylist information.

## Base URL
```
/api/stylist
```

## Authentication
- **Optional**: Endpoints work with or without authentication
- If authenticated, the system will use the authenticated user's stylist profile
- If not authenticated, you must provide `stylistId` or `userId` in the request

## Endpoints

### 1. Create or Update Stylist Availability
**POST** `/availability` or `/availability/:stylistId`

#### Description
Creates or updates a stylist's availability schedule. If availability doesn't exist, it will be created. If it exists, it will be updated.

#### URL Parameters (Optional)
| Parameter | Type | Description |
|-----------|------|-------------|
| `stylistId` | String | Stylist profile ID (MongoDB ObjectId) |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stylistId` | String | No* | Stylist profile ID (if not in URL params) |
| `weeklySchedule` | Object | No | Weekly availability schedule (see below) |
| `dateOverrides` | Array | No | Date-specific overrides (see below) |
| `bookingPreferences` | Object | No | Booking preferences (see below) |
| `timezone` | String | No | Timezone (default: "Asia/Kolkata") |
| `isActive` | Boolean | No | Whether availability is active (default: true) |

*Required if not authenticated and not in URL params

#### Weekly Schedule Structure
```json
{
  "weeklySchedule": {
    "monday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "slots": [
        {
          "startTime": "13:00",
          "endTime": "13:30",
          "duration": 30,
          "isAvailable": true,
          "maxBookings": 1
        },
        {
          "startTime": "16:30",
          "endTime": "17:00",
          "duration": 30,
          "isAvailable": true,
          "maxBookings": 1
        }
      ],
      "breaks": [
        {
          "startTime": "13:00",
          "endTime": "14:00",
          "reason": "Lunch break"
        }
      ]
    },
    "tuesday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "breaks": []
    },
    "wednesday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "breaks": []
    },
    "thursday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "breaks": []
    },
    "friday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "breaks": []
    },
    "saturday": {
      "isAvailable": true,
      "startTime": "10:00",
      "endTime": "16:00",
      "breaks": []
    },
    "sunday": {
      "isAvailable": false,
      "startTime": "09:00",
      "endTime": "18:00",
      "breaks": []
    }
  }
}
```

#### Date Overrides Structure
```json
{
  "dateOverrides": [
    {
      "date": "2024-12-25",
      "isAvailable": false,
      "reason": "Christmas Holiday"
    },
    {
      "date": "2024-12-31",
      "isAvailable": true,
      "startTime": "10:00",
      "endTime": "14:00",
      "reason": "New Year's Eve - Half Day",
      "breaks": []
    }
  ]
}
```

#### Booking Preferences Structure
```json
{
  "bookingPreferences": {
    "minAdvanceBooking": 2,      // Hours (default: 2)
    "maxAdvanceBooking": 30,     // Days (default: 30)
    "slotDuration": 60,           // Minutes (default: 60)
    "maxBookingsPerDay": 8,       // Number (default: 8)
    "bufferTime": 15              // Minutes between bookings (default: 15)
  }
}
```

#### Request Example
```bash
# Using stylistId in URL
curl -X POST "http://localhost:5000/api/stylist/availability/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{
    "weeklySchedule": {
      "monday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": [
          {
            "startTime": "13:00",
            "endTime": "14:00",
            "reason": "Lunch break"
          }
        ]
      },
      "tuesday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": []
      },
      "wednesday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": []
      },
      "thursday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": []
      },
      "friday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": []
      },
      "saturday": {
        "isAvailable": true,
        "startTime": "10:00",
        "endTime": "16:00",
        "breaks": []
      },
      "sunday": {
        "isAvailable": false,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": []
      }
    },
    "bookingPreferences": {
      "minAdvanceBooking": 2,
      "maxAdvanceBooking": 30,
      "slotDuration": 60,
      "maxBookingsPerDay": 8,
      "bufferTime": 15
    },
    "timezone": "Asia/Kolkata",
    "isActive": true
  }'

# Using stylistId in body
curl -X POST "http://localhost:5000/api/stylist/availability" \
  -H "Content-Type: application/json" \
  -d '{
    "stylistId": "507f1f77bcf86cd799439011",
    "weeklySchedule": { ... }
  }'
```

#### Response Example
```json
{
  "success": true,
  "message": "Availability created/updated successfully",
  "data": {
    "availability": {
      "_id": "507f1f77bcf86cd799439012",
      "stylistId": {
        "_id": "507f1f77bcf86cd799439011",
        "stylistName": "Sarah Fashion Studio",
        "stylistImage": "https://example.com/image.jpg",
        "stylistBio": "Professional stylist...",
        "stylistCity": "Mumbai",
        "stylistState": "Maharashtra",
        "userId": {
          "_id": "507f191e810c19729de860ea",
          "displayName": "Sarah Johnson",
          "email": "sarah@example.com",
          "phoneNumber": "+1234567890"
        }
      },
      "weeklySchedule": { ... },
      "dateOverrides": [],
      "bookingPreferences": {
        "minAdvanceBooking": 2,
        "maxAdvanceBooking": 30,
        "slotDuration": 60,
        "maxBookingsPerDay": 8,
        "bufferTime": 15
      },
      "timezone": "Asia/Kolkata",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "stylistInfo": {
      "stylistId": "507f1f77bcf86cd799439011",
      "stylistName": "Sarah Fashion Studio",
      "stylistImage": "https://example.com/image.jpg",
      "stylistCity": "Mumbai",
      "stylistState": "Maharashtra"
    }
  }
}
```

---

### 2. Get Availability with Stylist Information
**GET** `/availability` or `/availability/:stylistId`

#### Description
Retrieves a stylist's availability schedule along with their profile information. If no availability is set, returns stylist information with `hasAvailability: false`.

#### URL Parameters (Optional)
| Parameter | Type | Description |
|-----------|------|-------------|
| `stylistId` | String | Stylist profile ID (MongoDB ObjectId) |

#### Query Parameters (Alternative to URL params)
| Parameter | Type | Description |
|-----------|------|-------------|
| `stylistId` | String | Stylist profile ID |
| `userId` | String | User ID (will find associated stylist profile) |

#### Request Example
```bash
# Using stylistId in URL
curl -X GET "http://localhost:5000/api/stylist/availability/507f1f77bcf86cd799439011"

# Using query parameters
curl -X GET "http://localhost:5000/api/stylist/availability?stylistId=507f1f77bcf86cd799439011"

# Using userId
curl -X GET "http://localhost:5000/api/stylist/availability?userId=507f191e810c19729de860ea"
```

#### Response Example (With Availability)
```json
{
  "success": true,
  "message": "Availability with stylist information retrieved successfully",
  "data": {
    "availability": {
      "_id": "507f1f77bcf86cd799439012",
      "stylistId": {
        "_id": "507f1f77bcf86cd799439011",
        "stylistName": "Sarah Fashion Studio",
        "stylistImage": "https://example.com/image.jpg",
        "stylistBio": "Professional stylist with 8+ years of experience...",
        "stylistCity": "Mumbai",
        "stylistState": "Maharashtra",
        "stylistPhone": "+1234567890",
        "stylistEmail": "sarah.stylist@example.com",
        "stylistPrice": 2000,
        "stylistRating": 4.8,
        "userId": {
          "_id": "507f191e810c19729de860ea",
          "displayName": "Sarah Johnson",
          "email": "sarah@example.com",
          "phoneNumber": "+1234567890",
          "profilePicture": "https://example.com/profile.jpg"
        }
      },
      "weeklySchedule": {
        "monday": {
          "isAvailable": true,
          "startTime": "09:00",
          "endTime": "18:00",
          "breaks": [
            {
              "startTime": "13:00",
              "endTime": "14:00",
              "reason": "Lunch break"
            }
          ]
        },
        ...
      },
      "dateOverrides": [],
      "bookingPreferences": {
        "minAdvanceBooking": 2,
        "maxAdvanceBooking": 30,
        "slotDuration": 60,
        "maxBookingsPerDay": 8,
        "bufferTime": 15
      },
      "timezone": "Asia/Kolkata",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "stylistName": "Sarah Fashion Studio",
      ...
    },
    "hasAvailability": true
  }
}
```

#### Response Example (Without Availability)
```json
{
  "success": true,
  "message": "Stylist information retrieved (no availability set yet)",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "stylistName": "Sarah Fashion Studio",
      "stylistImage": "https://example.com/image.jpg",
      "stylistBio": "Professional stylist...",
      "stylistCity": "Mumbai",
      "stylistState": "Maharashtra",
      "userId": {
        "_id": "507f191e810c19729de860ea",
        "displayName": "Sarah Johnson",
        "email": "sarah@example.com",
        "phoneNumber": "+1234567890"
      },
      "stylistCategories": [
        {
          "_id": "507f191e810c19729de860eb",
          "name": "Personal Styling",
          "description": "One-on-one personal styling services",
          "image": "https://example.com/category.jpg",
          "icon": "👗"
        }
      ]
    },
    "availability": null,
    "hasAvailability": false
  }
}
```

---

## Time Format
All times should be in **24-hour format (HH:MM)**:
- Valid: `"09:00"`, `"18:00"`, `"14:30"`
- Invalid: `"9:00 AM"`, `"6:00 PM"`, `"2:30 PM"`

## Date Format
Dates in `dateOverrides` should be in **ISO 8601 format** or **YYYY-MM-DD**:
- Valid: `"2024-12-25"`, `"2024-12-25T00:00:00.000Z"`
- Invalid: `"12/25/2024"`, `"25-12-2024"`

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid stylist ID format"
}
```

```json
{
  "success": false,
  "message": "Invalid time format for monday. Use HH:MM format (24-hour)"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Stylist profile not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error creating/updating availability",
  "error": "Error details"
}
```

---

## Usage Examples

### Complete Workflow

#### 1. Create Availability for a Stylist
```bash
POST /api/stylist/availability/507f1f77bcf86cd799439011
{
  "weeklySchedule": {
    "monday": { "isAvailable": true, "startTime": "09:00", "endTime": "18:00", "breaks": [] },
    "tuesday": { "isAvailable": true, "startTime": "09:00", "endTime": "18:00", "breaks": [] },
    "wednesday": { "isAvailable": true, "startTime": "09:00", "endTime": "18:00", "breaks": [] },
    "thursday": { "isAvailable": true, "startTime": "09:00", "endTime": "18:00", "breaks": [] },
    "friday": { "isAvailable": true, "startTime": "09:00", "endTime": "18:00", "breaks": [] },
    "saturday": { "isAvailable": true, "startTime": "10:00", "endTime": "16:00", "breaks": [] },
    "sunday": { "isAvailable": false, "startTime": "09:00", "endTime": "18:00", "breaks": [] }
  },
  "bookingPreferences": {
    "minAdvanceBooking": 2,
    "maxAdvanceBooking": 30,
    "slotDuration": 60,
    "maxBookingsPerDay": 8,
    "bufferTime": 15
  }
}
```

#### 2. Add Date Override (Holiday)
```bash
POST /api/stylist/availability/507f1f77bcf86cd799439011
{
  "dateOverrides": [
    {
      "date": "2024-12-25",
      "isAvailable": false,
      "reason": "Christmas Holiday"
    }
  ]
}
```

#### 3. Fetch Availability with Stylist Info
```bash
GET /api/stylist/availability/507f1f77bcf86cd799439011
```

---

## Slot-Based Scheduling

The availability system supports **slot-based scheduling** where stylists can define specific time slots for each day instead of just start/end times. This is useful for stylists who want to offer appointments at specific times (e.g., Monday at 1:00 PM, 1:30 PM, 4:30 PM, etc.).

### Slot Structure
Each day can have a `slots` array with specific time slots:

```json
{
  "monday": {
    "isAvailable": true,
    "startTime": "13:00",  // Day start time (optional, for reference)
    "endTime": "18:00",    // Day end time (optional, for reference)
    "slots": [
      {
        "startTime": "13:00",    // Required: Slot start time (HH:MM)
        "endTime": "13:30",      // Required: Slot end time (HH:MM)
        "duration": 30,          // Optional: Duration in minutes (default: 60)
        "isAvailable": true,      // Optional: Whether slot is available (default: true)
        "maxBookings": 1         // Optional: Max bookings for this slot (default: 1)
      },
      {
        "startTime": "13:30",
        "endTime": "14:00",
        "duration": 30,
        "isAvailable": true,
        "maxBookings": 1
      },
      {
        "startTime": "16:30",
        "endTime": "17:00",
        "duration": 30,
        "isAvailable": true,
        "maxBookings": 1
      }
    ]
  }
}
```

### Example: Creating Slots for Monday Starting at 1:00 PM
```json
{
  "weeklySchedule": {
    "monday": {
      "isAvailable": true,
      "startTime": "13:00",
      "endTime": "18:00",
      "slots": [
        { "startTime": "13:00", "endTime": "13:30", "duration": 30 },
        { "startTime": "13:30", "endTime": "14:00", "duration": 30 },
        { "startTime": "14:00", "endTime": "14:30", "duration": 30 },
        { "startTime": "16:30", "endTime": "17:00", "duration": 30 }
      ]
    }
  }
}
```

### Slot Validation
- `startTime` and `endTime` are **required** for each slot
- Times must be in **HH:MM format (24-hour)**
- `endTime` must be **after** `startTime`
- `duration` is calculated automatically if not provided (endTime - startTime)
- `maxBookings` allows multiple bookings per slot if needed

## Notes

- **Partial Updates**: You can update only specific fields (e.g., just `weeklySchedule` or just `dateOverrides`)
- **Time Validation**: All times are validated to ensure they're in HH:MM format (24-hour)
- **Date Overrides**: Date overrides take precedence over weekly schedule
- **Timezone**: Default timezone is "Asia/Kolkata" but can be customized
- **Active Status**: Set `isActive: false` to temporarily disable availability without deleting it
- **Slot-Based vs Range-Based**: You can use either `slots` array for specific time slots OR `startTime`/`endTime` for continuous availability ranges
- **User Creation**: When creating test stylists without `userId`, a user is automatically created and returned in the response

