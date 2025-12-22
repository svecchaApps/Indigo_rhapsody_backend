# Test Stylist Endpoints Documentation

## Overview
These endpoints are designed for testing purposes to create stylist profiles and manage top stylist status. They are public endpoints (no authentication required) to facilitate easy testing and data setup for mobile app development.

## Base URL
```
/api/stylist
```

## Endpoints

### 1. Create Test Stylist Profile
**POST** `/test/create`

#### Description
Creates a stylist profile for testing purposes. This endpoint does not require authentication and allows you to quickly create stylist profiles with optional auto-approval and top stylist status.

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | No | User ID (MongoDB ObjectId). If not provided, profile will be created without user association |
| `stylistName` | String | Yes | Professional name of the stylist |
| `stylistEmail` | String | Yes | Professional email of the stylist |
| `stylistPhone` | String | Yes | Professional phone number |
| `stylistAddress` | String | Yes | Address of the stylist |
| `stylistCity` | String | Yes | City |
| `stylistState` | String | Yes | State |
| `stylistPincode` | String | Yes | Pincode |
| `stylistCountry` | String | Yes | Country |
| `stylistImage` | String | Yes | Profile image URL |
| `stylistBio` | String | Yes | Biography/description |
| `stylistPortfolio` | Array | Yes | Array of portfolio image URLs (at least 1 required) |
| `stylistExperience` | String | Yes | Experience description |
| `stylistEducation` | String | Yes | Education details |
| `stylistSkills` | Array | Yes | Array of skills (at least 1 required) |
| `stylistAvailability` | String | Yes | Availability schedule |
| `stylistPrice` | Number | No | Price per session (default: 0) |
| `stylistCategories` | Array | No | Array of category IDs |
| `autoApprove` | Boolean | No | Auto-approve the stylist (default: false) |
| `isTopStylist` | Boolean | No | Mark as top stylist (default: false) |
| `bookingStats` | Object | No | Booking statistics object |

#### Booking Stats Object (Optional)
```json
{
  "totalBookings": 100,
  "completedBookings": 85,
  "cancelledBookings": 15,
  "averageRating": 4.8,
  "totalEarnings": 170000
}
```

#### Request Example
```bash
curl -X POST "http://localhost:5000/api/stylist/test/create" \
  -H "Content-Type: application/json" \
  -d '{
    "stylistName": "Sarah Fashion Studio",
    "stylistEmail": "sarah.stylist@example.com",
    "stylistPhone": "+1234567890",
    "stylistAddress": "123 Fashion Street, Suite 4B",
    "stylistCity": "Mumbai",
    "stylistState": "Maharashtra",
    "stylistPincode": "400001",
    "stylistCountry": "India",
    "stylistImage": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
    "stylistBio": "Professional stylist with 8+ years of experience in fashion and personal styling.",
    "stylistPortfolio": [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800"
    ],
    "stylistExperience": "8+ years in fashion styling, worked with celebrities and fashion brands",
    "stylistEducation": "Fashion Design Degree from NIFT, Mumbai",
    "stylistSkills": [
      "Personal Styling",
      "Wardrobe Consulting",
      "Color Analysis",
      "Body Type Analysis"
    ],
    "stylistAvailability": "Monday-Friday: 9AM-6PM, Saturday: 10AM-4PM",
    "stylistPrice": 2000,
    "autoApprove": true,
    "isTopStylist": true,
    "bookingStats": {
      "totalBookings": 127,
      "completedBookings": 115,
      "cancelledBookings": 12,
      "averageRating": 4.8,
      "totalEarnings": 230000
    }
  }'
```

#### Response Example
```json
{
  "success": true,
  "message": "Test stylist profile created successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "stylistName": "Sarah Fashion Studio",
      "isApproved": true,
      "isTopStylist": true,
      "bookingStats": {
        "totalBookings": 127,
        "completedBookings": 115,
        "averageRating": 4.8
      },
      ...
    },
    "isTestData": true
  }
}
```

---

### 2. Mark/Unmark Stylist as Top Stylist
**POST** `/test/mark-top/:stylistId`

#### Description
Marks or unmarks a stylist as a top stylist. Top stylists are prioritized in the top stylists ranking algorithm.

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stylistId` | String | Yes | Stylist profile ID (MongoDB ObjectId) |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isTopStylist` | Boolean | No | Set to `true` to mark as top stylist, `false` to unmark (default: true) |

#### Request Example
```bash
# Mark as top stylist
curl -X POST "http://localhost:5000/api/stylist/test/mark-top/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{
    "isTopStylist": true
  }'

# Unmark as top stylist
curl -X POST "http://localhost:5000/api/stylist/test/mark-top/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{
    "isTopStylist": false
  }'
```

#### Response Example
```json
{
  "success": true,
  "message": "Stylist marked as top stylist successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "stylistName": "Sarah Fashion Studio",
      "isTopStylist": true,
      ...
    }
  }
}
```

---

## Top Stylist Ranking Algorithm

When a stylist is marked as `isTopStylist: true`, they receive:
- **+20 bonus points** in the combined score calculation
- **Priority ranking** - Top stylists appear first in the results, even if their combined score is lower
- **Higher visibility** in the top stylists endpoint (`/stylist/top`)

### Scoring Formula
```
Combined Score = Booking Score (0-50) + Rating Score (0-50) + Top Stylist Bonus (0 or 20)
```

Where:
- **Booking Score** = (completedBookings / maxBookings) × 50
- **Rating Score** = (rating / 5) × 50
- **Top Stylist Bonus** = 20 (if isTopStylist is true)

---

## Complete Testing Workflow

### Step 1: Create Test Stylists
```bash
# Create a top stylist
POST /api/stylist/test/create
{
  "stylistName": "Top Stylist 1",
  ... (all required fields),
  "autoApprove": true,
  "isTopStylist": true,
  "bookingStats": {
    "completedBookings": 150,
    "averageRating": 4.9
  }
}

# Create a regular stylist
POST /api/stylist/test/create
{
  "stylistName": "Regular Stylist 1",
  ... (all required fields),
  "autoApprove": true,
  "isTopStylist": false,
  "bookingStats": {
    "completedBookings": 100,
    "averageRating": 4.7
  }
}
```

### Step 2: Mark Existing Stylist as Top
```bash
POST /api/stylist/test/mark-top/{stylistId}
{
  "isTopStylist": true
}
```

### Step 3: View Top Stylists
```bash
GET /api/stylist/top?limit=10
```

The top stylists will be sorted with:
1. Top stylists (isTopStylist: true) first
2. Then by combined score (highest first)

---

## Notes

- These endpoints are **public** (no authentication required) for easy testing
- Use `autoApprove: true` to immediately approve stylists without admin intervention
- Use `isTopStylist: true` to mark stylists that should appear prominently in top stylists list
- The `userId` field is optional - you can create stylist profiles without user association for testing
- All created profiles will have `isTestData: true` flag in the response

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "stylistName is required"
}
```

### 404 Not Found (for mark-top endpoint)
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
  "message": "Error creating test stylist profile",
  "error": "Error details"
}
```

