# UserStylist Account API Documentation

## Overview
The UserStylist Account API provides endpoints to check if a user has a stylist account and create one if they don't. This API helps manage user styling preferences, fashion goals, and other styling-related information.

**Note:** All endpoints use `phoneNumber` as the primary identifier to find users. Authentication is not required.

## Base URL
All endpoints are prefixed with `/user`

---

## Endpoints

### 1. Check UserStylist Account

Check if a user has a `userStylist` account. Returns account data if exists, otherwise provides instructions to create one. Uses `phoneNumber` to identify the user.

#### Endpoint
- **GET** `/user/check-stylist-account/:phoneNumber`
- **POST** `/user/check-stylist-account`

#### Authentication
❌ Not Required

#### Request Parameters

**For GET with phoneNumber in URL:**
- `phoneNumber` (URL parameter) - Phone number of the user (e.g., "+1234567890" or "1234567890")

**For POST:**
```json
{
  "phoneNumber": "string (e.g., '+1234567890' or '1234567890')"
}
```

**Note:** The phoneNumber must match exactly with the phoneNumber stored in the User collection.

#### Response - Account Exists (200 OK)

```json
{
  "success": true,
  "hasUserStylistAccount": true,
  "message": "User has a stylist account",
  "data": {
    "userStylistId": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "userInfo": {
      "displayName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "stylePreferences": ["casual", "formal", "bohemian"],
    "fashionGoals": ["professional", "trendy"],
    "bodyType": ["hourglass", "petite"],
    "sizeInformation": ["M", "US 8"],
    "colorPreference": ["neutral", "pastel"],
    "budgetRange": 5000,
    "budgetCurrency": "INR",
    "experimental": ["vintage", "streetwear"],
    "goToOutfit": "Jeans and t-shirt",
    "fashionVibe": "minimalist",
    "userPictures": [
      {
        "image_url": "https://example.com/image1.jpg"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

#### Response - Account Does Not Exist (200 OK)

```json
{
  "success": true,
  "hasUserStylistAccount": false,
  "message": "User does not have a stylist account. Please create one to continue.",
  "actionRequired": "create_account",
  "userId": "507f191e810c19729de860ea",
  "userInfo": {
    "displayName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890"
  },
  "instructions": {
    "message": "To create a stylist account, please provide your styling preferences, fashion goals, and other relevant information.",
    "endpoint": "/user/create-stylist-account",
    "method": "POST",
    "requiredFields": [
      "style_Preference",
      "fashion_goals",
      "body_type",
      "size_Information",
      "color_Preference",
      "budget_Range",
      "budget_Currency"
    ],
    "optionalFields": [
      "user_Pictures",
      "experimental",
      "go_to_outfit",
      "fashion_vibe"
    ]
  }
}
```

#### Error Responses

**400 Bad Request - Missing Phone Number:**
```json
{
  "success": false,
  "message": "Phone number is required. Please provide phoneNumber in params or body."
}
```

**400 Bad Request - Empty Phone Number:**
```json
{
  "success": false,
  "message": "Phone number cannot be empty"
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found with the provided phone number"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal Server Error",
  "error": "Detailed error message"
}
```

---

### 2. Create UserStylist Account

Create a new `userStylist` account for a user with their styling preferences and information. Uses `phoneNumber` to identify the user.

#### Endpoint
- **POST** `/user/create-stylist-account`

#### Authentication
❌ Not Required

#### Request Body

```json
{
  "phoneNumber": "string (required, e.g., '+1234567890' or '1234567890')",
  "style_Preference": ["array", "of", "strings"],
  "fashion_goals": ["array", "of", "strings"],
  "body_type": ["array", "of", "strings"],
  "size_Information": ["array", "of", "strings"],
  "color_Preference": ["array", "of", "strings"],
  "budget_Range": 5000,
  "budget_Currency": "INR",
  "experimental": ["array", "of", "strings"],
  "go_to_outfit": "string",
  "fashion_vibe": "string",
  "user_Pictures": [
    {
      "image_url": "string"
    }
  ]
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phoneNumber` | String | **Yes** | Phone number of the user (e.g., "+1234567890" or "1234567890") |
| `style_Preference` | Array of Strings | No | User's style preferences (e.g., ["casual", "formal"]) |
| `fashion_goals` | Array of Strings | No | Fashion goals (e.g., ["professional", "trendy"]) |
| `body_type` | Array of Strings | No | Body type information |
| `size_Information` | Array of Strings | No | Size information (e.g., ["M", "US 8"]) |
| `color_Preference` | Array of Strings | No | Color preferences (e.g., ["neutral", "pastel"]) |
| `budget_Range` | Number | **Yes** | Budget range amount |
| `budget_Currency` | String | **Yes** | Currency code (e.g., "INR", "USD") |
| `experimental` | Array of Strings | No | Experimental style preferences |
| `go_to_outfit` | String | No | User's go-to outfit description |
| `fashion_vibe` | String | No | Fashion vibe description |
| `user_Pictures` | Array of Objects | No | Array of user pictures with `image_url` field |

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "User stylist account created successfully",
  "data": {
    "userStylistId": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "userInfo": {
      "displayName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "stylePreferences": ["casual", "formal"],
    "fashionGoals": ["professional"],
    "bodyType": ["hourglass"],
    "sizeInformation": ["M"],
    "colorPreference": ["neutral"],
    "budgetRange": 5000,
    "budgetCurrency": "INR",
    "experimental": [],
    "goToOutfit": "Jeans and t-shirt",
    "fashionVibe": "minimalist",
    "userPictures": [
      {
        "image_url": "https://example.com/image1.jpg"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request - Missing Phone Number:**
```json
{
  "success": false,
  "message": "Phone number is required. Please provide phoneNumber in body."
}
```

**400 Bad Request - Empty Phone Number:**
```json
{
  "success": false,
  "message": "Phone number cannot be empty"
}
```

**400 Bad Request - Missing Required Fields:**
```json
{
  "success": false,
  "message": "budget_Range and budget_Currency are required fields"
}
```

**400 Bad Request - Account Already Exists:**
```json
{
  "success": false,
  "message": "User already has a stylist account",
  "data": {
    "userStylistId": "507f1f77bcf86cd799439011"
  }
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found with the provided phone number"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal Server Error",
  "error": "Detailed error message"
}
```

---

## Usage Examples

### Example 1: Check Account (GET with Phone Number in URL)

```bash
curl -X GET "http://localhost:5000/user/check-stylist-account/+1234567890" \
  -H "Content-Type: application/json"
```

### Example 2: Check Account (POST with Phone Number in Body)

```bash
curl -X POST "http://localhost:5000/user/check-stylist-account" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

### Example 3: Create UserStylist Account

```bash
curl -X POST "http://localhost:5000/user/create-stylist-account" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "style_Preference": ["casual", "formal", "bohemian"],
    "fashion_goals": ["professional", "trendy"],
    "body_type": ["hourglass"],
    "size_Information": ["M", "US 8"],
    "color_Preference": ["neutral", "pastel", "earth tones"],
    "budget_Range": 5000,
    "budget_Currency": "INR",
    "experimental": ["vintage", "streetwear"],
    "go_to_outfit": "High-waisted jeans with a white t-shirt and blazer",
    "fashion_vibe": "minimalist with a touch of bohemian",
    "user_Pictures": [
      {
        "image_url": "https://example.com/profile1.jpg"
      },
      {
        "image_url": "https://example.com/profile2.jpg"
      }
    ]
  }'
```

### Example 4: Create Account (Minimal Required Fields)

```bash
curl -X POST "http://localhost:5000/user/create-stylist-account" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "budget_Range": 3000,
    "budget_Currency": "INR"
  }'
```

---

## Workflow Example

### Complete User Journey

1. **Check if user has stylist account (by phone number)**
   ```bash
   GET /user/check-stylist-account/+1234567890
   # or
   POST /user/check-stylist-account
   {
     "phoneNumber": "+1234567890"
   }
   ```

2. **If account doesn't exist, create one**
   ```bash
   POST /user/create-stylist-account
   {
     "phoneNumber": "+1234567890",
     "style_Preference": ["casual"],
     "fashion_goals": ["professional"],
     "budget_Range": 5000,
     "budget_Currency": "INR"
   }
   ```

3. **Verify account was created**
   ```bash
   GET /user/check-stylist-account/+1234567890
   # Now returns account data
   ```

---

## Data Model

### UserStylist Schema

```javascript
{
  userId: ObjectId (ref: "User"), // Required
  createdAt: Date,
  updatedAt: Date,
  style_Preference: [String],
  fashion_goals: [String],
  body_type: [String],
  size_Information: [String],
  color_Preference: [String],
  budget_Range: Number,
  budget_Currency: String,
  experimental: [String],
  go_to_outfit: String,
  fashion_vibe: String,
  user_Pictures: [{
    image_url: String
  }]
}
```

---

## Notes

1. **Phone Number Identification**: The API uses `phoneNumber` as the primary identifier to find users. The phoneNumber must match exactly with the phoneNumber stored in the User collection.

2. **No Authentication Required**: These endpoints do not require authentication, making them accessible for public use cases.

3. **Required Fields**: 
   - `phoneNumber` is required for both check and create operations
   - `budget_Range` and `budget_Currency` are required when creating an account
   - All other fields are optional

4. **Array Fields**: All array fields accept empty arrays `[]` as default values if not provided.

5. **Duplicate Prevention**: The system prevents creating duplicate `userStylist` accounts for the same user (identified by phoneNumber).

6. **User Validation**: The API validates that the user exists in the User collection (by phoneNumber) before creating or checking for a `userStylist` account.

7. **Phone Number Format**: Phone numbers should match the format stored in your User collection. Common formats include:
   - International format: "+1234567890"
   - Local format: "1234567890"
   - Ensure consistency with how phone numbers are stored in your database

---

## Integration with Frontend

### React/Next.js Example

```javascript
// Check if user has stylist account (by phone number)
const checkStylistAccount = async (phoneNumber) => {
  try {
    const response = await fetch(`/user/check-stylist-account/${phoneNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.hasUserStylistAccount) {
      // User has account, show their preferences
      console.log('Account data:', data.data);
    } else {
      // User doesn't have account, show create form
      console.log('Create account:', data.instructions);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Alternative: Check using POST
const checkStylistAccountPost = async (phoneNumber) => {
  try {
    const response = await fetch('/user/check-stylist-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber
      })
    });
    
    const data = await response.json();
    
    if (data.hasUserStylistAccount) {
      console.log('Account data:', data.data);
    } else {
      console.log('Create account:', data.instructions);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Create stylist account
const createStylistAccount = async (phoneNumber, formData) => {
  try {
    const response = await fetch('/user/create-stylist-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        style_Preference: formData.stylePreferences,
        fashion_goals: formData.fashionGoals,
        budget_Range: formData.budgetRange,
        budget_Currency: formData.budgetCurrency,
        // ... other fields
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Account created:', data.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Testing

### Using cURL

Save the following as `test_user_stylist_account.curl`:

```bash
# Test 1: Check account (by phone number)
curl -X GET "http://localhost:5000/user/check-stylist-account/+1234567890" \
  -H "Content-Type: application/json"

# Test 2: Create account
curl -X POST "http://localhost:5000/user/create-stylist-account" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "style_Preference": ["casual"],
    "fashion_goals": ["professional"],
    "budget_Range": 5000,
    "budget_Currency": "INR"
  }'

# Test 3: Check account again (should now exist)
curl -X GET "http://localhost:5000/user/check-stylist-account/+1234567890" \
  -H "Content-Type: application/json"
```

---

## Error Handling Best Practices

1. **Always check the `success` field** in responses
2. **Handle 400 errors** for validation issues
3. **Handle 404 errors** when user doesn't exist
4. **Handle 401 errors** for authentication failures
5. **Check `hasUserStylistAccount`** field to determine next action
6. **Use `actionRequired`** field to guide user flow

---

## Support

For issues or questions, please refer to the main API documentation or contact the development team.

