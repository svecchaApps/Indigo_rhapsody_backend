# Stylist Banner Create Endpoint - Test Examples

## Endpoint
**POST** `/stylist-banner`

**Authentication:** Required (Admin role)
```
Authorization: Bearer <admin_token>
```

---

## Example 1: Basic Banner (Minimal Fields)

```json
{
  "name": "Stylist Home Banner",
  "position": "stylist_home",
  "platform": "both",
  "webDesktopUrl": "https://example.com/banner-desktop.jpg",
  "mobileUrl": "https://example.com/banner-mobile.jpg"
}
```

---

## Example 2: Complete Banner with All Fields

```json
{
  "name": "Top Stylists Home Banner",
  "title": "Find Your Perfect Stylist",
  "subtitle": "Expert Personal Styling Services",
  "description": "Discover our top-rated stylists and book your personalized styling session today",
  "platform": "both",
  "position": "stylist_home",
  "customPosition": "",
  "actionType": "stylist_category",
  "actionValue": "507f1f77bcf86cd799439012",
  "actionUrl": "",
  "linkedStylist": null,
  "linkedStylistCategory": "507f1f77bcf86cd799439012",
  "displayOrder": 1,
  "isActive": true,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "buttonText": "Explore Stylists",
  "buttonColor": "#000000",
  "textColor": "#FFFFFF",
  "tags": ["stylist", "home", "featured", "top-rated"],
  "webDesktopUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920",
  "webTabletUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1024",
  "mobileUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=768",
  "imageUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920"
}
```

---

## Example 3: Banner Linked to Specific Stylist

```json
{
  "name": "Featured Stylist Banner",
  "title": "Meet Sarah Johnson",
  "subtitle": "Top Rated Personal Stylist",
  "description": "Book a session with our most popular stylist",
  "platform": "both",
  "position": "stylist_listing",
  "actionType": "stylist",
  "actionValue": "507f191e810c19729de860ea",
  "linkedStylist": "507f191e810c19729de860ea",
  "displayOrder": 2,
  "isActive": true,
  "buttonText": "View Profile",
  "buttonColor": "#FF6B6B",
  "textColor": "#FFFFFF",
  "tags": ["featured", "stylist", "popular"],
  "webDesktopUrl": "https://example.com/featured-stylist-desktop.jpg",
  "mobileUrl": "https://example.com/featured-stylist-mobile.jpg"
}
```

---

## Example 4: Banner for Stylist Category Page

```json
{
  "name": "Personal Styling Category Banner",
  "title": "Personal Styling Services",
  "subtitle": "One-on-One Styling Sessions",
  "description": "Get personalized styling advice from expert stylists",
  "platform": "both",
  "position": "stylist_category",
  "actionType": "stylist_category",
  "actionValue": "507f1f77bcf86cd799439012",
  "linkedStylistCategory": "507f1f77bcf86cd799439012",
  "displayOrder": 1,
  "isActive": true,
  "buttonText": "Browse Stylists",
  "buttonColor": "#4ECDC4",
  "textColor": "#FFFFFF",
  "tags": ["category", "personal-styling"],
  "webDesktopUrl": "https://example.com/category-banner-desktop.jpg",
  "webTabletUrl": "https://example.com/category-banner-tablet.jpg",
  "mobileUrl": "https://example.com/category-banner-mobile.jpg"
}
```

---

## Example 5: Banner with URL Action

```json
{
  "name": "Special Offer Banner",
  "title": "New Year Special",
  "subtitle": "20% Off First Booking",
  "description": "Limited time offer on your first styling session",
  "platform": "both",
  "position": "stylist_home",
  "actionType": "url",
  "actionUrl": "https://indigorhapsody.com/stylist/offers/new-year",
  "displayOrder": 3,
  "isActive": true,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T23:59:59.000Z",
  "buttonText": "Claim Offer",
  "buttonColor": "#FFD93D",
  "textColor": "#000000",
  "tags": ["offer", "promotion", "new-year"],
  "webDesktopUrl": "https://example.com/offer-banner-desktop.jpg",
  "mobileUrl": "https://example.com/offer-banner-mobile.jpg"
}
```

---

## Example 6: Web-Only Banner

```json
{
  "name": "Web Homepage Banner",
  "title": "Discover Top Stylists",
  "subtitle": "Book Your Session Today",
  "platform": "web",
  "position": "stylist_home",
  "actionType": "stylist_category",
  "actionValue": "507f1f77bcf86cd799439012",
  "displayOrder": 1,
  "isActive": true,
  "buttonText": "Get Started",
  "webDesktopUrl": "https://example.com/web-banner-desktop.jpg",
  "webTabletUrl": "https://example.com/web-banner-tablet.jpg"
}
```

---

## Example 7: Mobile-Only Banner

```json
{
  "name": "Mobile App Banner",
  "title": "Book a Stylist",
  "subtitle": "Available Now",
  "platform": "mobile",
  "position": "stylist_listing",
  "actionType": "page",
  "actionValue": "/stylist/booking",
  "displayOrder": 1,
  "isActive": true,
  "buttonText": "Book Now",
  "mobileUrl": "https://example.com/mobile-banner.jpg"
}
```

---

## Example 8: Banner for Top Stylists Page

```json
{
  "name": "Top Stylists Page Banner",
  "title": "Our Best Stylists",
  "subtitle": "Rated by Customers",
  "description": "Explore our top-rated stylists based on bookings and ratings",
  "platform": "both",
  "position": "stylist_top",
  "actionType": "none",
  "displayOrder": 1,
  "isActive": true,
  "buttonText": "View All",
  "buttonColor": "#6C5CE7",
  "textColor": "#FFFFFF",
  "tags": ["top", "featured", "ratings"],
  "webDesktopUrl": "https://example.com/top-stylists-desktop.jpg",
  "mobileUrl": "https://example.com/top-stylists-mobile.jpg"
}
```

---

## Example 9: Scheduled Banner (Future Date)

```json
{
  "name": "Valentine's Day Special",
  "title": "Valentine's Day Styling",
  "subtitle": "Look Your Best",
  "description": "Special styling packages for Valentine's Day",
  "platform": "both",
  "position": "stylist_home",
  "actionType": "url",
  "actionUrl": "https://indigorhapsody.com/stylist/valentines",
  "displayOrder": 1,
  "isActive": true,
  "startDate": "2024-02-01T00:00:00.000Z",
  "endDate": "2024-02-14T23:59:59.000Z",
  "buttonText": "Book Now",
  "buttonColor": "#E91E63",
  "textColor": "#FFFFFF",
  "tags": ["valentines", "special", "limited-time"],
  "webDesktopUrl": "https://example.com/valentines-desktop.jpg",
  "mobileUrl": "https://example.com/valentines-mobile.jpg"
}
```

---

## Example 10: Inactive Banner (For Testing)

```json
{
  "name": "Test Inactive Banner",
  "title": "This Banner is Inactive",
  "platform": "both",
  "position": "stylist_home",
  "isActive": false,
  "displayOrder": 99,
  "webDesktopUrl": "https://example.com/test-banner.jpg",
  "mobileUrl": "https://example.com/test-banner-mobile.jpg"
}
```

---

## cURL Examples

### Example 1: Basic Banner

```bash
curl -X POST "http://localhost:5000/stylist-banner" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stylist Home Banner",
    "position": "stylist_home",
    "platform": "both",
    "webDesktopUrl": "https://example.com/banner-desktop.jpg",
    "mobileUrl": "https://example.com/banner-mobile.jpg"
  }'
```

### Example 2: Complete Banner

```bash
curl -X POST "http://localhost:5000/stylist-banner" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Top Stylists Home Banner",
    "title": "Find Your Perfect Stylist",
    "subtitle": "Expert Personal Styling Services",
    "description": "Discover our top-rated stylists",
    "platform": "both",
    "position": "stylist_home",
    "actionType": "stylist_category",
    "actionValue": "507f1f77bcf86cd799439012",
    "linkedStylistCategory": "507f1f77bcf86cd799439012",
    "displayOrder": 1,
    "isActive": true,
    "buttonText": "Explore Stylists",
    "buttonColor": "#000000",
    "textColor": "#FFFFFF",
    "tags": ["stylist", "home", "featured"],
    "webDesktopUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920",
    "webTabletUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1024",
    "mobileUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=768"
  }'
```

### Example 3: Banner Linked to Stylist

```bash
curl -X POST "http://localhost:5000/stylist-banner" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Featured Stylist Banner",
    "title": "Meet Sarah Johnson",
    "subtitle": "Top Rated Personal Stylist",
    "platform": "both",
    "position": "stylist_listing",
    "actionType": "stylist",
    "actionValue": "507f191e810c19729de860ea",
    "linkedStylist": "507f191e810c19729de860ea",
    "displayOrder": 2,
    "isActive": true,
    "buttonText": "View Profile",
    "buttonColor": "#FF6B6B",
    "webDesktopUrl": "https://example.com/featured-stylist.jpg",
    "mobileUrl": "https://example.com/featured-stylist-mobile.jpg"
  }'
```

---

## Required vs Optional Fields

### Required Fields
- `name` - Banner name (required)

### Optional Fields (with defaults)
- `platform` - Default: `"both"`
- `position` - Default: `"stylist_home"`
- `actionType` - Default: `"none"`
- `isActive` - Default: `true`
- `displayOrder` - Default: `0`
- `buttonText` - Default: `"Book Now"`
- `buttonColor` - Default: `"#000000"`
- `textColor` - Default: `"#FFFFFF"`

### Image Fields
At least one image URL should be provided:
- `webDesktopUrl` - Desktop image
- `webTabletUrl` - Tablet image
- `mobileUrl` - Mobile image
- `imageUrl` - Legacy/fallback image

---

## Position Values

Valid position values:
- `stylist_home` - Stylist home/landing page
- `stylist_listing` - Stylist listing page
- `stylist_profile` - Individual stylist profile
- `stylist_category` - Stylist category page
- `stylist_search` - Stylist search page
- `stylist_top` - Top stylists page
- `custom` - Custom position (requires `customPosition` field)

---

## Action Type Values

Valid action type values:
- `none` - No action
- `url` - External URL (requires `actionUrl`)
- `stylist` - Link to stylist (requires `actionValue` = stylist ID)
- `stylist_category` - Link to category (requires `actionValue` = category ID)
- `page` - Link to internal page (requires `actionValue` = page route)

---

## Platform Values

Valid platform values:
- `web` - Web only
- `mobile` - Mobile only
- `both` - Both platforms (default)

---

## Notes

1. Replace `YOUR_ADMIN_TOKEN` with actual admin JWT token
2. Replace ObjectIds (like `507f1f77bcf86cd799439012`) with actual IDs from your database
3. Image URLs can be any valid image URL or Firebase Storage URLs
4. Dates should be in ISO 8601 format
5. Tags can be an array or comma-separated string
6. If `linkedStylist` or `linkedStylistCategory` is provided, ensure the ID exists in the database

