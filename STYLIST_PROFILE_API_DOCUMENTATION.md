# Stylist Profile API Documentation

## Overview
The Stylist Profile API provides comprehensive endpoints for managing stylist profiles, including creation, updates, approval workflows, and advanced filtering capabilities. This API supports both public access (for approved stylists) and admin-only operations.

## Base URL
All endpoints are prefixed with `/stylist`

## Authentication
- **Public Endpoints**: No authentication required
- **User Endpoints**: JWT token required (Bearer token)
- **Admin Endpoints**: JWT token + Admin role required

---

## Endpoints

### 1. Get Approved Stylist Profiles (Public)

Get a paginated list of approved stylist profiles with advanced filtering options. This is a public endpoint that doesn't require authentication.

#### Endpoint
- **GET** `/stylist/approved`

#### Authentication
❌ Not Required

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Number of results per page |
| `city` | String | No | - | Filter by city (case-insensitive partial match) |
| `state` | String | No | - | Filter by state (case-insensitive partial match) |
| `minRating` | Number | No | 0 | Minimum rating filter (e.g., 4.0) |
| `maxPrice` | Number | No | - | Maximum price filter (e.g., 5000) |
| `category` | String | No | - | Filter by category name (case-insensitive partial match) |
| `categoryId` | String (ObjectId) | No | - | Filter by category ID (alternative to category name) |
| `sortBy` | String | No | `stylistRating` | Field to sort by (`stylistRating`, `stylistPrice`, `createdAt`, `stylistName`) |
| `sortOrder` | String | No | `desc` | Sort order (`asc` or `desc`) |

#### Example Request

```bash
GET /stylist/approved?city=Mumbai&state=Maharashtra&minRating=4.0&maxPrice=5000&sortBy=stylistRating&sortOrder=desc&page=1&limit=10
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Approved stylist profiles retrieved successfully",
  "data": {
    "stylistProfiles": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": {
          "_id": "507f191e810c19729de860ea",
          "displayName": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890",
          "profilePicture": "https://example.com/profile.jpg"
        },
        "stylistName": "John's Fashion Studio",
        "stylistEmail": "john.stylist@example.com",
        "stylistPhone": "+1234567890",
        "stylistAddress": "123 Fashion Street",
        "stylistCity": "Mumbai",
        "stylistState": "Maharashtra",
        "stylistPincode": "400001",
        "stylistCountry": "India",
        "stylistImage": "https://example.com/stylist.jpg",
        "stylistBio": "Professional stylist with 5+ years of experience",
        "stylistPortfolio": [
          "https://example.com/portfolio1.jpg",
          "https://example.com/portfolio2.jpg"
        ],
        "stylistExperience": "5+ years in fashion styling",
        "stylistEducation": "Fashion Design Degree",
        "stylistSkills": ["Personal Styling", "Wardrobe Consulting"],
        "stylistCategories": [
          {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Personal Styling",
            "description": "One-on-one personal styling services",
            "image": "https://example.com/category.jpg",
            "icon": "https://example.com/icon.svg"
          }
        ],
        "stylistAvailability": "Monday-Friday: 9AM-6PM",
        "stylistPrice": 3000,
        "stylistRating": 4.5,
        "stylistReviews": ["Great stylist!", "Very professional"],
        "isApproved": true,
        "approvalStatus": "approved",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProfiles": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Filter Examples

**Filter by City:**
```bash
GET /stylist/approved?city=Mumbai
```

**Filter by State:**
```bash
GET /stylist/approved?state=Maharashtra
```

**Filter by Rating (Minimum 4.0):**
```bash
GET /stylist/approved?minRating=4.0
```

**Filter by Maximum Price:**
```bash
GET /stylist/approved?maxPrice=5000
```

**Combined Filters:**
```bash
GET /stylist/approved?city=Mumbai&state=Maharashtra&minRating=4.0&maxPrice=5000&sortBy=stylistRating&sortOrder=desc
```

**Sort by Price (Ascending):**
```bash
GET /stylist/approved?sortBy=stylistPrice&sortOrder=asc
```

**Sort by Name:**
```bash
GET /stylist/approved?sortBy=stylistName&sortOrder=asc
```

**Filter by Category Name:**
```bash
GET /stylist/approved?category=Personal Styling
```

**Filter by Category ID:**
```bash
GET /stylist/approved?categoryId=507f1f77bcf86cd799439012
```

**Combined Filters with Category:**
```bash
GET /stylist/approved?category=Personal Styling&city=Mumbai&minRating=4.0&maxPrice=5000
```

---

### 2. Get All Stylist Profiles (Admin)

Get a paginated list of all stylist profiles with advanced filtering and search capabilities. Admin only.

#### Endpoint
- **GET** `/stylist/all`

#### Authentication
✅ Required (Admin role)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Number of results per page |
| `status` | String | No | `all` | Filter by status (`all`, `approved`, `pending`, `rejected`) |
| `search` | String | No | - | Search in stylistName, stylistEmail, stylistCity, stylistState (case-insensitive) |
| `sortBy` | String | No | `createdAt` | Field to sort by (`createdAt`, `stylistName`, `stylistRating`, `stylistPrice`) |
| `sortOrder` | String | No | `desc` | Sort order (`asc` or `desc`) |

#### Example Request

```bash
GET /stylist/all?status=approved&search=Mumbai&sortBy=createdAt&sortOrder=desc&page=1&limit=10
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profiles retrieved successfully",
  "data": {
    "stylistProfiles": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": {
          "_id": "507f191e810c19729de860ea",
          "displayName": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890",
          "role": "Stylist",
          "profilePicture": "https://example.com/profile.jpg"
        },
        "stylistName": "John's Fashion Studio",
        "stylistEmail": "john.stylist@example.com",
        "stylistCity": "Mumbai",
        "stylistState": "Maharashtra",
        "isApproved": true,
        "approvalStatus": "approved",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalProfiles": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Filter Examples

**Get All Approved Profiles:**
```bash
GET /stylist/all?status=approved
```

**Get All Pending Profiles:**
```bash
GET /stylist/all?status=pending
```

**Get All Rejected Profiles:**
```bash
GET /stylist/all?status=rejected
```

**Search by Name:**
```bash
GET /stylist/all?search=John
```

**Search by City:**
```bash
GET /stylist/all?search=Mumbai
```

**Search by Email:**
```bash
GET /stylist/all?search=john@example.com
```

**Combined Filters:**
```bash
GET /stylist/all?status=approved&search=Mumbai&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```

---

### 3. Get Pending Stylist Profiles (Admin)

Get a paginated list of stylist profiles pending approval. Admin only.

#### Endpoint
- **GET** `/stylist/pending`

#### Authentication
✅ Required (Admin role)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Number of results per page |

#### Example Request

```bash
GET /stylist/pending?page=1&limit=10
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Pending stylist profiles retrieved successfully",
  "data": {
    "stylistProfiles": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": {
          "_id": "507f191e810c19729de860ea",
          "displayName": "Jane Doe",
          "email": "jane@example.com",
          "phoneNumber": "+1234567891",
          "role": "Stylist",
          "profilePicture": "https://example.com/profile.jpg"
        },
        "stylistName": "Jane's Styling",
        "approvalStatus": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalPending": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 4. Get Stylist Profile by User ID (Public)

Get a specific stylist profile by user ID. Public endpoint, no authentication required.

#### Endpoint
- **GET** `/stylist/profile/:userId`

#### Authentication
❌ Not Required

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | String (ObjectId) | Yes | MongoDB ObjectId of the user |

#### Example Request

```bash
GET /stylist/profile/507f191e810c19729de860ea
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profile retrieved successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f191e810c19729de860ea",
        "displayName": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "profilePicture": "https://example.com/profile.jpg"
      },
      "stylistName": "John's Fashion Studio",
      "stylistEmail": "john.stylist@example.com",
      "stylistPhone": "+1234567890",
      "stylistAddress": "123 Fashion Street",
      "stylistCity": "Mumbai",
      "stylistState": "Maharashtra",
      "stylistPincode": "400001",
      "stylistCountry": "India",
      "stylistImage": "https://example.com/stylist.jpg",
      "stylistBio": "Professional stylist with 5+ years of experience",
      "stylistPortfolio": [
        "https://example.com/portfolio1.jpg",
        "https://example.com/portfolio2.jpg"
      ],
      "stylistExperience": "5+ years in fashion styling",
      "stylistEducation": "Fashion Design Degree",
      "stylistSkills": ["Personal Styling", "Wardrobe Consulting"],
      "stylistAvailability": "Monday-Friday: 9AM-6PM",
      "stylistPrice": 3000,
      "stylistRating": 4.5,
      "stylistReviews": ["Great stylist!", "Very professional"],
      "isApproved": true,
      "approvalStatus": "approved",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "Stylist profile not found"
}
```

---

### 5. Get My Stylist Profile (User)

Get the authenticated user's own stylist profile.

#### Endpoint
- **GET** `/stylist/my-profile`

#### Authentication
✅ Required

#### Example Request

```bash
GET /stylist/my-profile
Authorization: Bearer <token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profile retrieved successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f191e810c19729de860ea",
        "displayName": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "role": "Stylist",
        "profilePicture": "https://example.com/profile.jpg"
      },
      "stylistName": "John's Fashion Studio",
      "isApproved": false,
      "approvalStatus": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 6. Create Stylist Profile (User)

Create a new stylist profile for the authenticated user.

#### Endpoint
- **POST** `/stylist/create`

#### Authentication
✅ Required

#### Request Body

```json
{
  "stylistName": "John's Fashion Studio",
  "stylistEmail": "john.stylist@example.com",
  "stylistPhone": "+1234567890",
  "stylistAddress": "123 Fashion Street",
  "stylistCity": "Mumbai",
  "stylistState": "Maharashtra",
  "stylistPincode": "400001",
  "stylistCountry": "India",
  "stylistImage": "https://example.com/stylist.jpg",
  "stylistBio": "Professional stylist with 5+ years of experience",
  "stylistPortfolio": [
    "https://example.com/portfolio1.jpg",
    "https://example.com/portfolio2.jpg"
  ],
  "stylistExperience": "5+ years in fashion styling",
  "stylistEducation": "Fashion Design Degree",
  "stylistSkills": [
    "Personal Styling",
    "Wardrobe Consulting",
    "Color Analysis"
  ],
  "stylistCategories": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "stylistAvailability": "Monday-Friday: 9AM-6PM",
  "stylistPrice": 3000
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `stylistName` | String | Professional name of the stylist |
| `stylistEmail` | String | Professional email address |
| `stylistPhone` | String | Professional phone number |
| `stylistAddress` | String | Complete address |
| `stylistCity` | String | City name |
| `stylistState` | String | State name |
| `stylistPincode` | String | Postal/ZIP code |
| `stylistCountry` | String | Country name |
| `stylistImage` | String | Profile image URL |
| `stylistBio` | String | Biography/description |
| `stylistPortfolio` | Array of Strings | Portfolio images/links (non-empty array) |
| `stylistExperience` | String | Experience details |
| `stylistEducation` | String | Education details |
| `stylistSkills` | Array of Strings | Skills list (non-empty array) |
| `stylistAvailability` | String | Availability information |
| `stylistPrice` | Number | Optional - Pricing information |

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Stylist profile created successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f191e810c19729de860ea",
      "stylistName": "John's Fashion Studio",
      "isApproved": false,
      "approvalStatus": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### Error Responses

**400 Bad Request - Profile Already Exists:**
```json
{
  "success": false,
  "message": "Stylist profile already exists for this user"
}
```

**400 Bad Request - Missing Required Field:**
```json
{
  "success": false,
  "message": "stylistName is required"
}
```

**400 Bad Request - Invalid Array:**
```json
{
  "success": false,
  "message": "stylistPortfolio must be a non-empty array"
}
```

---

### 7. Update Stylist Profile (User)

Update the authenticated user's stylist profile. Note: Updating an approved profile will reset its approval status to pending.

#### Endpoint
- **PUT** `/stylist/update`

#### Authentication
✅ Required

#### Request Body

All fields are optional. Only include fields you want to update:

```json
{
  "stylistName": "Updated Fashion Studio",
  "stylistBio": "Updated bio with more experience",
  "stylistPrice": 3500,
  "stylistPortfolio": [
    "https://example.com/new-portfolio1.jpg",
    "https://example.com/new-portfolio2.jpg"
  ],
  "stylistSkills": [
    "Personal Styling",
    "Wardrobe Consulting",
    "Color Analysis",
    "Event Styling"
  ]
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profile updated successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "stylistName": "Updated Fashion Studio",
      "approvalStatus": "pending",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  }
}
```

**Note:** If the profile was previously approved, updating it will reset `isApproved` to `false` and `approvalStatus` to `pending`.

---

### 8. Delete Stylist Profile (User)

Delete the authenticated user's stylist profile.

#### Endpoint
- **DELETE** `/stylist/delete`

#### Authentication
✅ Required

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profile deleted successfully"
}
```

---

### 9. Approve Stylist Profile (Admin)

Approve a stylist profile. Admin only.

#### Endpoint
- **POST** `/stylist/approve/:stylistId`

#### Authentication
✅ Required (Admin role)

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stylistId` | String (ObjectId) | Yes | MongoDB ObjectId of the stylist profile |

#### Request Body

```json
{
  "adminNotes": "Optional admin notes about the approval"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profile approved successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "isApproved": true,
      "approvalStatus": "approved",
      "approvedAt": "2024-01-20T14:45:00.000Z",
      "approvedBy": "507f191e810c19729de860ea",
      "adminNotes": "Profile looks good"
    }
  }
}
```

**Note:** This action sends a notification to the stylist via FCM if they have a registered FCM token.

#### Error Responses

**400 Bad Request - Already Approved:**
```json
{
  "success": false,
  "message": "Stylist profile is already approved"
}
```

---

### 10. Reject Stylist Profile (Admin)

Reject a stylist profile. Admin only.

#### Endpoint
- **POST** `/stylist/reject/:stylistId`

#### Authentication
✅ Required (Admin role)

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stylistId` | String (ObjectId) | Yes | MongoDB ObjectId of the stylist profile |

#### Request Body

```json
{
  "rejectionReason": "Required reason for rejection",
  "adminNotes": "Optional admin notes"
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `rejectionReason` | String | Reason for rejection (required) |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist profile rejected successfully",
  "data": {
    "stylistProfile": {
      "_id": "507f1f77bcf86cd799439011",
      "isApproved": false,
      "approvalStatus": "rejected",
      "rejectedAt": "2024-01-20T14:45:00.000Z",
      "rejectedBy": "507f191e810c19729de860ea",
      "rejectionReason": "Incomplete portfolio",
      "adminNotes": "Please resubmit with more portfolio images"
    }
  }
}
```

**Note:** This action sends a notification to the stylist via FCM if they have a registered FCM token.

#### Error Responses

**400 Bad Request - Missing Rejection Reason:**
```json
{
  "success": false,
  "message": "Rejection reason is required"
}
```

**400 Bad Request - Already Rejected:**
```json
{
  "success": false,
  "message": "Stylist profile is already rejected"
}
```

---

### 11. Get Stylist Statistics (Admin)

Get comprehensive statistics about stylists. Admin only.

#### Endpoint
- **GET** `/stylist/statistics`

#### Authentication
✅ Required (Admin role)

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist statistics retrieved successfully",
  "data": {
    "statistics": {
      "totalStylists": 150,
      "approvedStylists": 120,
      "pendingStylists": 20,
      "rejectedStylists": 10,
      "averageRating": 4.3
    },
    "topRatedStylists": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "stylistName": "John's Fashion Studio",
        "stylistRating": 4.9,
        "stylistCity": "Mumbai",
        "stylistState": "Maharashtra",
        "userId": {
          "displayName": "John Doe",
          "email": "john@example.com"
        }
      }
    ]
  }
}
```

---

## Advanced Filtering Guide

### Public Endpoint Filters (`/stylist/approved`)

#### Location Filters

**Filter by City:**
```bash
GET /stylist/approved?city=Mumbai
```

**Filter by State:**
```bash
GET /stylist/approved?state=Maharashtra
```

**Filter by City and State:**
```bash
GET /stylist/approved?city=Mumbai&state=Maharashtra
```

#### Rating Filters

**Minimum Rating:**
```bash
GET /stylist/approved?minRating=4.0
```

**Minimum Rating with Location:**
```bash
GET /stylist/approved?city=Mumbai&minRating=4.5
```

#### Price Filters

**Maximum Price:**
```bash
GET /stylist/approved?maxPrice=5000
```

**Price Range (using minRating as minimum):**
```bash
GET /stylist/approved?maxPrice=5000&minRating=0
```

#### Sorting Options

**Sort by Rating (Default - Descending):**
```bash
GET /stylist/approved?sortBy=stylistRating&sortOrder=desc
```

**Sort by Price (Ascending - Cheapest First):**
```bash
GET /stylist/approved?sortBy=stylistPrice&sortOrder=asc
```

**Sort by Price (Descending - Most Expensive First):**
```bash
GET /stylist/approved?sortBy=stylistPrice&sortOrder=desc
```

**Sort by Name (Alphabetical):**
```bash
GET /stylist/approved?sortBy=stylistName&sortOrder=asc
```

**Sort by Creation Date (Newest First):**
```bash
GET /stylist/approved?sortBy=createdAt&sortOrder=desc
```

#### Pagination

**Page 1 (Default):**
```bash
GET /stylist/approved?page=1&limit=10
```

**Page 2:**
```bash
GET /stylist/approved?page=2&limit=10
```

**Custom Page Size:**
```bash
GET /stylist/approved?page=1&limit=20
```

#### Complete Filter Example

```bash
GET /stylist/approved?city=Mumbai&state=Maharashtra&minRating=4.0&maxPrice=5000&sortBy=stylistRating&sortOrder=desc&page=1&limit=10
```

This will return:
- Stylists in Mumbai, Maharashtra
- With rating >= 4.0
- With price <= 5000
- Sorted by rating (highest first)
- Page 1 with 10 results per page

---

### Admin Endpoint Filters (`/stylist/all`)

#### Status Filters

**All Profiles:**
```bash
GET /stylist/all?status=all
```

**Approved Only:**
```bash
GET /stylist/all?status=approved
```

**Pending Only:**
```bash
GET /stylist/all?status=pending
```

**Rejected Only:**
```bash
GET /stylist/all?status=rejected
```

#### Search Filters

**Search by Name:**
```bash
GET /stylist/all?search=John
```

**Search by Email:**
```bash
GET /stylist/all?search=john@example.com
```

**Search by City:**
```bash
GET /stylist/all?search=Mumbai
```

**Search by State:**
```bash
GET /stylist/all?search=Maharashtra
```

**Note:** Search is case-insensitive and searches across stylistName, stylistEmail, stylistCity, and stylistState.

#### Sorting Options

**Sort by Creation Date (Default - Newest First):**
```bash
GET /stylist/all?sortBy=createdAt&sortOrder=desc
```

**Sort by Name:**
```bash
GET /stylist/all?sortBy=stylistName&sortOrder=asc
```

**Sort by Rating:**
```bash
GET /stylist/all?sortBy=stylistRating&sortOrder=desc
```

**Sort by Price:**
```bash
GET /stylist/all?sortBy=stylistPrice&sortOrder=asc
```

#### Complete Filter Example

```bash
GET /stylist/all?status=approved&search=Mumbai&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```

This will return:
- Approved stylists only
- Matching "Mumbai" in name, email, city, or state
- Sorted by creation date (newest first)
- Page 1 with 20 results per page

---

## Usage Examples

### Example 1: Get Approved Stylists in Mumbai with High Rating

```bash
curl -X GET "http://localhost:5000/stylist/approved?city=Mumbai&minRating=4.5&sortBy=stylistRating&sortOrder=desc" \
  -H "Content-Type: application/json"
```

### Example 2: Search for Stylists Under Budget

```bash
curl -X GET "http://localhost:5000/stylist/approved?maxPrice=3000&sortBy=stylistPrice&sortOrder=asc" \
  -H "Content-Type: application/json"
```

### Example 3: Admin - Get All Pending Profiles

```bash
curl -X GET "http://localhost:5000/stylist/pending?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

### Example 4: Admin - Search Approved Stylists

```bash
curl -X GET "http://localhost:5000/stylist/all?status=approved&search=John&sortBy=stylistName&sortOrder=asc" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

### Example 5: Create Stylist Profile

```bash
curl -X POST "http://localhost:5000/stylist/create" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stylistName": "John'\''s Fashion Studio",
    "stylistEmail": "john.stylist@example.com",
    "stylistPhone": "+1234567890",
    "stylistAddress": "123 Fashion Street",
    "stylistCity": "Mumbai",
    "stylistState": "Maharashtra",
    "stylistPincode": "400001",
    "stylistCountry": "India",
    "stylistImage": "https://example.com/stylist.jpg",
    "stylistBio": "Professional stylist with 5+ years of experience",
    "stylistPortfolio": [
      "https://example.com/portfolio1.jpg",
      "https://example.com/portfolio2.jpg"
    ],
    "stylistExperience": "5+ years in fashion styling",
    "stylistEducation": "Fashion Design Degree",
    "stylistSkills": [
      "Personal Styling",
      "Wardrobe Consulting"
    ],
    "stylistAvailability": "Monday-Friday: 9AM-6PM",
    "stylistPrice": 3000
  }'
```

### Example 6: Update Stylist Profile

```bash
curl -X PUT "http://localhost:5000/stylist/update" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stylistPrice": 3500,
    "stylistBio": "Updated bio with more experience"
  }'
```

### Example 7: Admin - Approve Stylist Profile

```bash
curl -X POST "http://localhost:5000/stylist/approve/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "adminNotes": "Profile looks good, approved!"
  }'
```

### Example 8: Admin - Reject Stylist Profile

```bash
curl -X POST "http://localhost:5000/stylist/reject/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rejectionReason": "Incomplete portfolio - need more images",
    "adminNotes": "Please add at least 5 portfolio images"
  }'
```

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful message",
  "data": {
    // Response data
  }
}
```

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)"
}
```

### Pagination Response

Paginated responses include pagination metadata:

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "stylistProfiles": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalProfiles": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## Approval Workflow

### Status Flow

1. **Pending**: Initial status when profile is created
2. **Approved**: Admin approves the profile (becomes visible to public)
3. **Rejected**: Admin rejects the profile

### Status Changes

- **Creating Profile**: Sets status to `pending`
- **Updating Approved Profile**: Resets status to `pending` (requires re-approval)
- **Admin Approval**: Sets status to `approved` and `isApproved` to `true`
- **Admin Rejection**: Sets status to `rejected` and `isApproved` to `false`

### Notifications

- **Approval**: Sends FCM notification to stylist when profile is approved
- **Rejection**: Sends FCM notification to stylist when profile is rejected (includes rejection reason)

---

## Notes

1. **Public vs Private**: Only approved stylist profiles are visible through the public `/stylist/approved` endpoint
2. **Auto-Reset**: Updating an approved profile automatically resets it to pending status
3. **Search Functionality**: Admin search is case-insensitive and searches across multiple fields
4. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters
5. **Sorting**: Multiple sort options available for different use cases
6. **Filtering**: Advanced filtering available for location, rating, price, and status
7. **Notifications**: Automatic notifications sent on approval/rejection status changes
8. **Validation**: All required fields are validated before profile creation/update

---

## Frontend Integration Examples

### React/Next.js Example

```javascript
// Get approved stylists with filters
const getApprovedStylists = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 10,
    ...(filters.city && { city: filters.city }),
    ...(filters.state && { state: filters.state }),
    ...(filters.minRating && { minRating: filters.minRating }),
    ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
    sortBy: filters.sortBy || 'stylistRating',
    sortOrder: filters.sortOrder || 'desc'
  });

  const response = await fetch(`/stylist/approved?${params}`);
  const data = await response.json();
  
  return data;
};

// Usage
const stylists = await getApprovedStylists({
  city: 'Mumbai',
  state: 'Maharashtra',
  minRating: 4.0,
  maxPrice: 5000,
  page: 1,
  limit: 10
});
```

---

## Testing

### Using cURL

Save the following as `test_stylist_api.curl`:

```bash
# Test 1: Get approved stylists (public)
curl -X GET "http://localhost:5000/stylist/approved?city=Mumbai&minRating=4.0" \
  -H "Content-Type: application/json"

# Test 2: Get all stylists (admin)
curl -X GET "http://localhost:5000/stylist/all?status=approved&search=Mumbai" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Test 3: Get pending stylists (admin)
curl -X GET "http://localhost:5000/stylist/pending?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Test 4: Get statistics (admin)
curl -X GET "http://localhost:5000/stylist/statistics" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Support

For issues or questions, please refer to the main API documentation or contact the development team.

