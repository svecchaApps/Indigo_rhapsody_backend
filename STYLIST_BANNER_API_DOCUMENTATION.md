# Stylist Banner API Documentation

## Overview
The Stylist Banner API provides comprehensive endpoints for managing banners specifically for the stylist section of the platform. This includes banners for stylist home pages, listings, profiles, categories, and search pages. The system supports multi-platform display (web/mobile), scheduling, analytics, and linking to stylists or stylist categories.

## Base URL
All endpoints are prefixed with `/stylist-banner`

## Authentication
- **Public Endpoints**: No authentication required
- **Admin Endpoints**: JWT token + Admin role required

---

## Endpoints

### 1. Get All Stylist Banners (Public)

Get a paginated list of stylist banners with advanced filtering options.

#### Endpoint
- **GET** `/stylist-banner`

#### Authentication
❌ Not Required

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `position` | String | No | - | Filter by position (`stylist_home`, `stylist_listing`, `stylist_profile`, `stylist_category`, `stylist_search`, `stylist_top`, `custom`) |
| `platform` | String | No | - | Filter by platform (`web`, `mobile`, `both`) |
| `isActive` | Boolean | No | - | Filter by active status (`true` or `false`) |
| `linkedStylist` | String (ObjectId) | No | - | Filter by linked stylist ID |
| `linkedStylistCategory` | String (ObjectId) | No | - | Filter by linked stylist category ID |
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Number of results per page |
| `sortBy` | String | No | `displayOrder` | Field to sort by |
| `sortOrder` | String | No | `asc` | Sort order (`asc` or `desc`) |

#### Example Request

```bash
GET /stylist-banner?position=stylist_home&platform=web&isActive=true&page=1&limit=10
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banners retrieved successfully",
  "data": {
    "banners": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Top Stylists Banner",
        "title": "Find Your Perfect Stylist",
        "subtitle": "Expert styling services",
        "description": "Discover our top-rated stylists",
        "platform": "both",
        "position": "stylist_home",
        "images": {
          "web": {
            "desktop": "https://example.com/banner-desktop.jpg",
            "tablet": "https://example.com/banner-tablet.jpg"
          },
          "mobile": "https://example.com/banner-mobile.jpg"
        },
        "actionType": "stylist_category",
        "actionValue": "507f1f77bcf86cd799439012",
        "linkedStylistCategory": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Personal Styling",
          "description": "One-on-one personal styling services"
        },
        "buttonText": "Explore Stylists",
        "buttonColor": "#000000",
        "textColor": "#FFFFFF",
        "displayOrder": 1,
        "isActive": true,
        "clickCount": 150,
        "impressionCount": 500,
        "createdDate": "2024-01-15T10:30:00.000Z",
        "updatedDate": "2024-01-20T14:45:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalBanners": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 2. Get Stylist Banners by Position (Public)

Get all active stylist banners for a specific position (e.g., stylist home page).

#### Endpoint
- **GET** `/stylist-banner/position/:position`

#### Authentication
❌ Not Required

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `position` | String | Yes | Position name (`stylist_home`, `stylist_listing`, `stylist_profile`, `stylist_category`, `stylist_search`, `stylist_top`, `custom`) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `platform` | String | No | - | Filter by platform (`web`, `mobile`, `both`) |

#### Example Request

```bash
GET /stylist-banner/position/stylist_home?platform=web
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banners for position 'stylist_home' retrieved successfully",
  "data": {
    "position": "stylist_home",
    "banners": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Top Stylists Banner",
        "title": "Find Your Perfect Stylist",
        "images": {
          "web": {
            "desktop": "https://example.com/banner-desktop.jpg"
          },
          "mobile": "https://example.com/banner-mobile.jpg"
        },
        "displayOrder": 1,
        "isActive": true
      }
    ],
    "count": 1
  }
}
```

#### Available Positions

- `stylist_home` - Stylist home/landing page
- `stylist_listing` - Stylist listing/search page
- `stylist_profile` - Individual stylist profile page
- `stylist_category` - Stylist category page
- `stylist_search` - Stylist search results page
- `stylist_top` - Top stylists page
- `custom` - Custom position (use `customPosition` field)

---

### 3. Get Stylist Banner by ID (Public)

Get a specific stylist banner by its ID.

#### Endpoint
- **GET** `/stylist-banner/:bannerId`

#### Authentication
❌ Not Required

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Top Stylists Banner",
    "title": "Find Your Perfect Stylist",
    "subtitle": "Expert styling services",
    "description": "Discover our top-rated stylists",
    "platform": "both",
    "position": "stylist_home",
    "images": {
      "web": {
        "desktop": "https://example.com/banner-desktop.jpg",
        "tablet": "https://example.com/banner-tablet.jpg"
      },
      "mobile": "https://example.com/banner-mobile.jpg"
    },
    "linkedStylist": {
      "_id": "507f191e810c19729de860ea",
      "stylistName": "John's Fashion Studio",
      "stylistImage": "https://example.com/stylist.jpg",
      "stylistCity": "Mumbai",
      "stylistState": "Maharashtra"
    },
    "actionType": "stylist",
    "actionValue": "507f191e810c19729de860ea",
    "buttonText": "Book Now",
    "displayOrder": 1,
    "isActive": true,
    "clickCount": 150,
    "impressionCount": 500
  }
}
```

---

### 4. Create Stylist Banner (Admin)

Create a new stylist banner. Admin only.

#### Endpoint
- **POST** `/stylist-banner`

#### Authentication
✅ Required (Admin role)

#### Request Body

```json
{
  "name": "Top Stylists Banner",
  "title": "Find Your Perfect Stylist",
  "subtitle": "Expert styling services",
  "description": "Discover our top-rated stylists",
  "platform": "both",
  "position": "stylist_home",
  "customPosition": "",
  "actionType": "stylist_category",
  "actionValue": "507f1f77bcf86cd799439012",
  "actionUrl": "",
  "linkedStylist": "507f191e810c19729de860ea",
  "linkedStylistCategory": "507f1f77bcf86cd799439012",
  "displayOrder": 1,
  "isActive": true,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "buttonText": "Explore Stylists",
  "buttonColor": "#000000",
  "textColor": "#FFFFFF",
  "tags": ["stylist", "home", "featured"],
  "webDesktopUrl": "https://example.com/banner-desktop.jpg",
  "webTabletUrl": "https://example.com/banner-tablet.jpg",
  "mobileUrl": "https://example.com/banner-mobile.jpg",
  "imageUrl": "https://example.com/banner.jpg"
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | **Yes** | Banner name |
| `title` | String | No | Banner title text |
| `subtitle` | String | No | Banner subtitle text |
| `description` | String | No | Banner description |
| `platform` | String | No | Platform (`web`, `mobile`, `both`) - default: `both` |
| `position` | String | No | Position (`stylist_home`, `stylist_listing`, etc.) - default: `stylist_home` |
| `customPosition` | String | No | Custom position name (if position is `custom`) |
| `actionType` | String | No | Action type (`none`, `url`, `stylist`, `stylist_category`, `page`) - default: `none` |
| `actionValue` | String | No | Action value (stylist ID, category ID, etc.) |
| `actionUrl` | String | No | Action URL (if actionType is `url`) |
| `linkedStylist` | String (ObjectId) | No | Linked stylist profile ID |
| `linkedStylistCategory` | String (ObjectId) | No | Linked stylist category ID |
| `displayOrder` | Number | No | Display order (default: 0) |
| `isActive` | Boolean | No | Active status (default: true) |
| `startDate` | Date | No | Start date for scheduling |
| `endDate` | Date | No | End date for scheduling |
| `buttonText` | String | No | Button text (default: "Book Now") |
| `buttonColor` | String | No | Button color (default: "#000000") |
| `textColor` | String | No | Text color (default: "#FFFFFF") |
| `tags` | Array of Strings | No | Tags for categorization |
| `webDesktopUrl` | String | No | Desktop image URL |
| `webTabletUrl` | String | No | Tablet image URL |
| `mobileUrl` | String | No | Mobile image URL |
| `imageUrl` | String | No | Legacy image URL |

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Stylist banner created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Top Stylists Banner",
    "position": "stylist_home",
    "isActive": true,
    "createdDate": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 5. Update Stylist Banner (Admin)

Update an existing stylist banner. Admin only.

#### Endpoint
- **PUT** `/stylist-banner/:bannerId`

#### Authentication
✅ Required (Admin role)

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Request Body

All fields are optional. Only include fields you want to update:

```json
{
  "name": "Updated Banner Name",
  "title": "Updated Title",
  "isActive": false,
  "displayOrder": 2
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated Banner Name",
    "title": "Updated Title",
    "isActive": false,
    "updatedDate": "2024-01-20T14:45:00.000Z"
  }
}
```

---

### 6. Delete Stylist Banner (Admin)

Delete a stylist banner. Admin only.

#### Endpoint
- **DELETE** `/stylist-banner/:bannerId`

#### Authentication
✅ Required (Admin role)

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Top Stylists Banner"
  }
}
```

---

### 7. Toggle Stylist Banner Status (Admin)

Toggle the active/inactive status of a stylist banner. Admin only.

#### Endpoint
- **PATCH** `/stylist-banner/:bannerId/toggle`

#### Authentication
✅ Required (Admin role)

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner activated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Top Stylists Banner",
    "isActive": true
  }
}
```

---

### 8. Track Stylist Banner Click (Public)

Track when a user clicks on a stylist banner. Public endpoint for analytics.

#### Endpoint
- **POST** `/stylist-banner/:bannerId/click`

#### Authentication
❌ Not Required

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner click tracked successfully",
  "data": {
    "bannerId": "507f1f77bcf86cd799439011",
    "clickCount": 151
  }
}
```

---

### 9. Track Stylist Banner Impression (Public)

Track when a stylist banner is viewed/displayed. Public endpoint for analytics.

#### Endpoint
- **POST** `/stylist-banner/:bannerId/impression`

#### Authentication
❌ Not Required

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner impression tracked successfully",
  "data": {
    "bannerId": "507f1f77bcf86cd799439011",
    "impressionCount": 501
  }
}
```

---

### 10. Get Stylist Banner Analytics (Admin)

Get analytics data for a specific stylist banner. Admin only.

#### Endpoint
- **GET** `/stylist-banner/:bannerId/analytics`

#### Authentication
✅ Required (Admin role)

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bannerId` | String (ObjectId) | Yes | MongoDB ObjectId of the banner |

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banner analytics retrieved successfully",
  "data": {
    "bannerId": "507f1f77bcf86cd799439011",
    "bannerName": "Top Stylists Banner",
    "clickCount": 150,
    "impressionCount": 500,
    "clickThroughRate": 30.0,
    "createdDate": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 11. Reorder Stylist Banners (Admin)

Reorder multiple stylist banners by updating their display order. Admin only.

#### Endpoint
- **POST** `/stylist-banner/reorder`

#### Authentication
✅ Required (Admin role)

#### Request Body

```json
{
  "bannerOrders": [
    {
      "bannerId": "507f1f77bcf86cd799439011",
      "displayOrder": 1
    },
    {
      "bannerId": "507f1f77bcf86cd799439012",
      "displayOrder": 2
    },
    {
      "bannerId": "507f1f77bcf86cd799439013",
      "displayOrder": 3
    }
  ]
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Stylist banners reordered successfully",
  "data": {
    "updatedCount": 3
  }
}
```

---

## Position Types

### Available Positions

| Position | Description | Use Case |
|----------|-------------|----------|
| `stylist_home` | Stylist home/landing page | Main stylist section landing page |
| `stylist_listing` | Stylist listing page | All stylists listing/search page |
| `stylist_profile` | Individual stylist profile | Individual stylist profile pages |
| `stylist_category` | Stylist category page | Category-specific stylist pages |
| `stylist_search` | Stylist search results | Search results page |
| `stylist_top` | Top stylists page | Top/featured stylists page |
| `custom` | Custom position | Custom pages (use `customPosition` field) |

---

## Action Types

### Available Action Types

| Action Type | Description | Action Value Format |
|-------------|-------------|---------------------|
| `none` | No action | - |
| `url` | External URL | Full URL string |
| `stylist` | Link to stylist profile | Stylist ID (ObjectId) |
| `stylist_category` | Link to stylist category | Category ID (ObjectId) |
| `page` | Link to internal page | Page route/path |

---

## Usage Examples

### Example 1: Get Banners for Stylist Home Page

```bash
curl -X GET "http://localhost:5000/stylist-banner/position/stylist_home?platform=web" \
  -H "Content-Type: application/json"
```

### Example 2: Get All Active Banners

```bash
curl -X GET "http://localhost:5000/stylist-banner?isActive=true&platform=both" \
  -H "Content-Type: application/json"
```

### Example 3: Create Stylist Banner (Admin)

```bash
curl -X POST "http://localhost:5000/stylist-banner" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Top Stylists Banner",
    "title": "Find Your Perfect Stylist",
    "subtitle": "Expert styling services",
    "platform": "both",
    "position": "stylist_home",
    "actionType": "stylist_category",
    "actionValue": "507f1f77bcf86cd799439012",
    "linkedStylistCategory": "507f1f77bcf86cd799439012",
    "webDesktopUrl": "https://example.com/banner-desktop.jpg",
    "mobileUrl": "https://example.com/banner-mobile.jpg",
    "buttonText": "Explore Stylists",
    "displayOrder": 1,
    "isActive": true
  }'
```

### Example 4: Update Banner

```bash
curl -X PUT "http://localhost:5000/stylist-banner/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false,
    "displayOrder": 2
  }'
```

### Example 5: Track Banner Click

```bash
curl -X POST "http://localhost:5000/stylist-banner/507f1f77bcf86cd799439011/click" \
  -H "Content-Type: application/json"
```

### Example 6: Get Banner Analytics (Admin)

```bash
curl -X GET "http://localhost:5000/stylist-banner/507f1f77bcf86cd799439011/analytics" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
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

---

## Scheduling

Banners can be scheduled with start and end dates:

- **Start Date**: Banner becomes active on this date
- **End Date**: Banner becomes inactive after this date
- **No Dates**: Banner is always active (if `isActive` is true)
- **Date Range**: Banner is only active between start and end dates

The system automatically filters banners based on current date when retrieving active banners.

---

## Analytics

### Metrics Tracked

1. **Click Count**: Number of times banner was clicked
2. **Impression Count**: Number of times banner was displayed
3. **Click-Through Rate (CTR)**: Calculated as `(clickCount / impressionCount) * 100`

### Tracking Endpoints

- **Click Tracking**: `POST /stylist-banner/:bannerId/click`
- **Impression Tracking**: `POST /stylist-banner/:bannerId/impression`
- **Analytics View**: `GET /stylist-banner/:bannerId/analytics` (Admin only)

---

## Notes

1. **Platform Support**: Banners support `web`, `mobile`, or `both` platforms
2. **Responsive Images**: Separate images for desktop, tablet, and mobile
3. **Date Filtering**: Active banners are automatically filtered by date range
4. **Display Order**: Banners are sorted by `displayOrder` (ascending) by default
5. **Linking**: Banners can link to stylists, categories, URLs, or pages
6. **Analytics**: Click and impression tracking for performance monitoring
7. **Scheduling**: Start/end dates for time-based banner display
8. **Multi-position**: Same banner can be used in different positions

---

## Frontend Integration Examples

### React/Next.js Example

```javascript
// Get banners for stylist home page
const getStylistBanners = async (position, platform = 'web') => {
  try {
    const response = await fetch(
      `/stylist-banner/position/${position}?platform=${platform}`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data.banners;
    }
  } catch (error) {
    console.error('Error fetching stylist banners:', error);
  }
};

// Track banner click
const trackBannerClick = async (bannerId) => {
  try {
    await fetch(`/stylist-banner/${bannerId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error tracking click:', error);
  }
};

// Track banner impression
const trackBannerImpression = async (bannerId) => {
  try {
    await fetch(`/stylist-banner/${bannerId}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
};

// Usage
const banners = await getStylistBanners('stylist_home', 'web');
banners.forEach(banner => {
  // Display banner
  trackBannerImpression(banner._id);
  
  // On click
  trackBannerClick(banner._id);
});
```

---

## Testing

### Using cURL

Save the following as `test_stylist_banner_api.curl`:

```bash
# Test 1: Get banners by position (public)
curl -X GET "http://localhost:5000/stylist-banner/position/stylist_home?platform=web" \
  -H "Content-Type: application/json"

# Test 2: Get all banners (public)
curl -X GET "http://localhost:5000/stylist-banner?isActive=true" \
  -H "Content-Type: application/json"

# Test 3: Create banner (admin)
curl -X POST "http://localhost:5000/stylist-banner" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Banner",
    "position": "stylist_home",
    "platform": "both",
    "webDesktopUrl": "https://example.com/banner.jpg",
    "mobileUrl": "https://example.com/banner-mobile.jpg"
  }'

# Test 4: Track click (public)
curl -X POST "http://localhost:5000/stylist-banner/BANNER_ID/click" \
  -H "Content-Type: application/json"

# Test 5: Get analytics (admin)
curl -X GET "http://localhost:5000/stylist-banner/BANNER_ID/analytics" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Support

For issues or questions, please refer to the main API documentation or contact the development team.

