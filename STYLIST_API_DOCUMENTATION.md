# Stylist Profile API Documentation

## Overview
The Stylist Profile API provides comprehensive functionality for managing stylist profiles, including creation, updates, approval system, and public access to approved stylists.

## Base URL
```
/api/stylist
```

## Authentication
- **User Routes**: Require valid JWT token with user authentication
- **Admin Routes**: Require valid JWT token with Admin role
- **Public Routes**: No authentication required

## Endpoints

### 1. Create Stylist Profile
**POST** `/create`
- **Authentication**: Required (User)
- **Description**: Creates a new stylist profile for the authenticated user
- **Body**: See required fields below
- **Response**: Created stylist profile with pending approval status

### 2. Get My Stylist Profile
**GET** `/my-profile`
- **Authentication**: Required (User)
- **Description**: Retrieves the authenticated user's stylist profile
- **Response**: User's stylist profile details

### 3. Update Stylist Profile
**PUT** `/update`
- **Authentication**: Required (User)
- **Description**: Updates the authenticated user's stylist profile
- **Body**: Fields to update (partial updates supported)
- **Note**: Updates reset approval status to pending

### 4. Delete Stylist Profile
**DELETE** `/delete`
- **Authentication**: Required (User)
- **Description**: Deletes the authenticated user's stylist profile
- **Response**: Success confirmation

### 5. Get All Stylist Profiles (Admin)
**GET** `/all`
- **Authentication**: Required (Admin)
- **Description**: Retrieves all stylist profiles with filtering and pagination
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `status` (optional): Filter by status (all, approved, pending, rejected)
  - `search` (optional): Search by name, email, city, state
  - `sortBy` (optional): Sort field (default: createdAt)
  - `sortOrder` (optional): Sort order (asc, desc)

### 6. Get Pending Stylist Profiles (Admin)
**GET** `/pending`
- **Authentication**: Required (Admin)
- **Description**: Retrieves stylist profiles pending approval
- **Query Parameters**:
  - `page` (optional): Page number
  - `limit` (optional): Items per page

### 7. Get Approved Stylist Profiles (Public)
**GET** `/approved`
- **Authentication**: None required
- **Description**: Retrieves approved stylist profiles for public viewing
- **Query Parameters**:
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `city` (optional): Filter by city
  - `state` (optional): Filter by state
  - `minRating` (optional): Minimum rating filter
  - `maxPrice` (optional): Maximum price filter
  - `sortBy` (optional): Sort field (default: stylistRating)
  - `sortOrder` (optional): Sort order

### 8. Get Stylist Statistics (Admin)
**GET** `/statistics`
- **Authentication**: Required (Admin)
- **Description**: Retrieves stylist platform statistics
- **Response**: Total counts, approval rates, average rating, top-rated stylists

### 9. Approve Stylist Profile (Admin)
**POST** `/approve/:stylistId`
- **Authentication**: Required (Admin)
- **Description**: Approves a stylist profile
- **Body**:
  ```json
  {
    "adminNotes": "Optional admin notes"
  }
  ```
- **Response**: Updated stylist profile with approval details

### 10. Reject Stylist Profile (Admin)
**POST** `/reject/:stylistId`
- **Authentication**: Required (Admin)
- **Description**: Rejects a stylist profile
- **Body**:
  ```json
  {
    "rejectionReason": "Required rejection reason",
    "adminNotes": "Optional admin notes"
  }
  ```
- **Response**: Updated stylist profile with rejection details

### 11. Get Stylist Profile by User ID
**GET** `/profile/:userId`
- **Authentication**: None required
- **Description**: Retrieves a specific stylist profile by user ID, including availability slots and booking data
- **Response**: Stylist profile details with availability and bookings

#### Response Structure
```json
{
  "success": true,
  "message": "Stylist profile retrieved successfully",
  "data": {
    "stylistProfile": {
      // Full stylist profile object
    },
    "availability": {
      "_id": "...",
      "stylistId": "...",
      "weeklySchedule": {
        "monday": {
          "isAvailable": true,
          "startTime": "13:00",
          "endTime": "18:00",
          "slots": [
            {
              "startTime": "13:00",
              "endTime": "13:30",
              "duration": 30,
              "isAvailable": true,
              "maxBookings": 1
            }
          ],
          "breaks": []
        }
        // ... other days
      },
      "bookingPreferences": { ... },
      "isActive": true
    },
    "bookings": {
      "upcoming": [
        // Array of upcoming bookings (next 30 days)
      ],
      "recent": [
        // Array of recent bookings (last 30 days)
      ],
      "stats": {
        "totalBookings": 127,
        "upcomingBookings": 5,
        "completedBookings": 115,
        "cancelledBookings": 12,
        "averageRating": 4.8
      }
    },
    "isDummyData": false
  }
}
```

#### Notes
- **Availability**: Includes weekly schedule with slot-based time slots for each day
- **Bookings**: Includes upcoming bookings (next 30 days) and recent bookings (last 30 days)
- **Stats**: Provides booking statistics including total, upcoming, completed, cancelled bookings, and average rating
- **Dummy Data**: If no profile is found, returns dummy data with sample availability slots and bookings

## Required Fields for Stylist Profile

```json
{
  "stylistName": "String (required)",
  "stylistEmail": "String (required)",
  "stylistPhone": "String (required)",
  "stylistAddress": "String (required)",
  "stylistCity": "String (required)",
  "stylistState": "String (required)",
  "stylistPincode": "String (required)",
  "stylistCountry": "String (required)",
  "stylistImage": "String (required)",
  "stylistBio": "String (required)",
  "stylistPortfolio": ["Array of Strings (required)"],
  "stylistExperience": "String (required)",
  "stylistEducation": "String (required)",
  "stylistSkills": ["Array of Strings (required)"],
  "stylistAvailability": "String (required)",
  "stylistPrice": "Number (optional)"
}
```

## Approval System

### Status Flow
1. **Pending**: Initial status when profile is created
2. **Approved**: Admin approves the profile
3. **Rejected**: Admin rejects the profile

### Features
- **Automatic Notifications**: Email and FCM notifications on status changes
- **Admin Notes**: Admins can add notes during approval/rejection
- **Rejection Reasons**: Required reason when rejecting profiles
- **Profile Reset**: Updates reset approval status to pending
- **Audit Trail**: Tracks who approved/rejected and when

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Example Usage

### Create Stylist Profile
```bash
curl -X POST "http://localhost:3000/api/stylist/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "stylistName": "Sarah Johnson",
    "stylistEmail": "sarah@example.com",
    "stylistPhone": "+1234567890",
    "stylistAddress": "123 Fashion Street",
    "stylistCity": "New York",
    "stylistState": "NY",
    "stylistPincode": "10001",
    "stylistCountry": "USA",
    "stylistImage": "https://example.com/profile.jpg",
    "stylistBio": "Professional stylist with 5+ years experience",
    "stylistPortfolio": ["https://example.com/portfolio1.jpg"],
    "stylistExperience": "5+ years in fashion styling",
    "stylistEducation": "Fashion Design Degree from FIT",
    "stylistSkills": ["Personal Styling", "Wardrobe Consulting"],
    "stylistAvailability": "Monday-Friday, 9AM-6PM",
    "stylistPrice": 150
  }'
```

### Approve Stylist Profile (Admin)
```bash
curl -X POST "http://localhost:3000/api/stylist/approve/STYLIST_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "adminNotes": "Profile looks great! Approved for platform."
  }'
```

## Error Codes
- **400**: Bad Request (validation errors, missing fields)
- **401**: Unauthorized (invalid or missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (stylist profile not found)
- **500**: Internal Server Error

## Notes
- Only one stylist profile per user is allowed
- Profile updates reset approval status to pending
- Approved profiles are visible to the public
- All timestamps are in UTC
- File uploads should be handled separately (not included in this API)
