# Expense Tracker API Documentation

## Base URLs
- **Development**: `http://localhost:3000/api`
- **Production**: `https://expense-tracker-q432.onrender.com/api`

## Interactive Documentation
- **Development**: http://localhost:3000/api-docs
- **Production**: https://expense-tracker-q432.onrender.com/api-docs

## Authentication
Most endpoints require authentication using JWT tokens. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes per IP/email
- **General API endpoints**: 60 requests per minute per IP

## Common Response Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `423 Locked` - Account locked due to failed attempts
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## 🔐 Authentication Endpoints

### Register User
Creates a new user account with enhanced security validation.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Password Requirements:**
- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common patterns

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "emailVerified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Password validation failed
- `409` - Email already in use
- `429` - Too many registration attempts

---

### Login User
Authenticates a user and returns access/refresh tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "emailVerified": false,
    "lastLoginAt": "2025-06-29T08:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Account Lockout:**
- After 5 failed attempts, account is locked for 30 minutes
- Failed attempts are tracked per user

**Errors:**
- `401` - Invalid credentials (shows remaining attempts)
- `423` - Account locked (shows unlock time)
- `429` - Too many login attempts

---

### Refresh Access Token
Exchanges a refresh token for new access and refresh tokens.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token Lifespans:**
- Access Token: 15 minutes
- Refresh Token: 7 days

**Errors:**
- `400` - Refresh token is required
- `401` - Invalid or expired refresh token

---

### Logout
Invalidates a specific refresh token (single device logout).

**Endpoint:** `POST /auth/logout`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Logout All Devices
Invalidates all refresh tokens for the authenticated user.

**Endpoint:** `POST /auth/logout-all`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "message": "Logged out from all devices successfully"
}
```

---

## 📱 Message/SMS Endpoints
*Requires Authentication*

### Parse SMS Message
Processes and categorizes an SMS message for expense/income tracking.

**Endpoint:** `POST /messages/parse-sms`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "content": "CLIQ: You received 100.00 JOD from Ahmad Ali at 2025-06-29 14:30",
  "timestamp": "2025-06-29T14:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "actionRequired": false,
  "message": {
    "id": 123,
    "content": "CLIQ: You received 100.00 JOD from Ahmad Ali at 2025-06-29 14:30",
    "createdAt": "2025-06-29T14:30:00Z"
  },
  "parsedData": {
    "type": "INCOME",
    "amount": 100.00,
    "merchant": "Ahmad Ali",
    "category": "Transfer",
    "source": "CLIQ",
    "timestamp": "2025-06-29T14:30:00Z"
  },
  "transaction": {
    "id": 456,
    "amount": 100.00,
    "categoryId": 5,
    "merchant": "Ahmad Ali"
  }
}
```

**Response when categorization needed:**
```json
{
  "actionRequired": true,
  "message": {
    "id": 123,
    "content": "Purchase of 50.00 JOD at Unknown Merchant",
    "createdAt": "2025-06-29T14:30:00Z"
  },
  "parsedData": {
    "type": "EXPENSE",
    "amount": 50.00,
    "merchant": "Unknown Merchant",
    "timestamp": "2025-06-29T14:30:00Z"
  },
  "suggestedCategories": [
    { "id": 1, "name": "Food & Dining" },
    { "id": 2, "name": "Shopping" }
  ]
}
```

---

### Get Messages
Retrieves user's messages with optional filtering.

**Endpoint:** `GET /messages`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `actionRequired` (optional): Filter by action required (true/false)

**Response (200 OK):**
```json
{
  "messages": [
    {
      "id": 123,
      "content": "CLIQ: You received 100.00 JOD from Ahmad Ali",
      "createdAt": "2025-06-29T14:30:00Z",
      "parsedData": {
        "type": "INCOME",
        "amount": 100.00,
        "merchant": "Ahmad Ali"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

### Get Message by ID
Retrieves a specific message by its ID.

**Endpoint:** `GET /messages/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "id": 123,
  "content": "CLIQ: You received 100.00 JOD from Ahmad Ali",
  "createdAt": "2025-06-29T14:30:00Z",
  "parsedData": {
    "type": "INCOME",
    "amount": 100.00,
    "merchant": "Ahmad Ali",
    "category": "Transfer"
  }
}
```

---

## 🏷️ Category Endpoints
*Requires Authentication*

### Get Categories
Retrieves user's expense/income categories.

**Endpoint:** `GET /categories`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `type` (optional): Filter by type ("EXPENSE" or "INCOME")

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Food & Dining",
    "keywords": "restaurant,food,cafe,dining",
    "type": "EXPENSE",
    "createdAt": "2025-06-29T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Salary",
    "keywords": "salary,wage,payroll",
    "type": "INCOME",
    "createdAt": "2025-06-29T10:00:00Z"
  }
]
```

---

### Add Category
Creates a new expense or income category.

**Endpoint:** `POST /categories`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Transportation",
  "keywords": "uber,taxi,bus,metro,transport",
  "type": "EXPENSE"
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "name": "Transportation",
  "keywords": "uber,taxi,bus,metro,transport",
  "type": "EXPENSE",
  "createdAt": "2025-06-29T14:30:00Z"
}
```

**Errors:**
- `400` - Name and type are required
- `409` - Category name already exists for this user

---

### Update Category
Updates an existing category.

**Endpoint:** `PUT /categories/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Food & Restaurants",
  "keywords": "restaurant,food,cafe,dining,takeout",
  "type": "EXPENSE"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Food & Restaurants",
  "keywords": "restaurant,food,cafe,dining,takeout",
  "type": "EXPENSE",
  "updatedAt": "2025-06-29T14:30:00Z"
}
```

---

### Delete Category
Deletes a category. Associated transactions will need to be recategorized.

**Endpoint:** `DELETE /categories/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "message": "Category deleted successfully"
}
```

**Errors:**
- `404` - Category not found or doesn't belong to user

---

## 📊 Summary/Analytics Endpoints
*Requires Authentication*

### Get Expense Summary
Retrieves expense analytics for a specified period.

**Endpoint:** `GET /summary/expenses`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `period` (optional): "day", "week", "month", "year"

**Response (200 OK):**
```json
{
  "totalAmount": 1250.75,
  "transactionCount": 45,
  "period": {
    "startDate": "2025-06-01T00:00:00Z",
    "endDate": "2025-06-30T23:59:59Z"
  },
  "trends": {
    "previousPeriod": 1100.50,
    "changePercentage": 13.65,
    "trend": "increasing"
  }
}
```

---

### Get Income Summary
Retrieves income analytics for a specified period.

**Endpoint:** `GET /summary/incomes`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `period` (optional): "day", "week", "month", "year"

**Response (200 OK):**
```json
{
  "totalAmount": 3500.00,
  "transactionCount": 12,
  "period": {
    "startDate": "2025-06-01T00:00:00Z",
    "endDate": "2025-06-30T23:59:59Z"
  },
  "trends": {
    "previousPeriod": 3500.00,
    "changePercentage": 0.00,
    "trend": "stable"
  }
}
```

---

### Get Expenses by Category
Retrieves expense breakdown by category.

**Endpoint:** `GET /summary/expenses/by-category`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response (200 OK):**
```json
{
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Food & Dining",
      "totalAmount": 450.25,
      "transactionCount": 18,
      "percentage": 36.02
    },
    {
      "categoryId": 2,
      "categoryName": "Transportation",
      "totalAmount": 320.50,
      "transactionCount": 15,
      "percentage": 25.64
    }
  ],
  "totalAmount": 1250.75,
  "period": {
    "startDate": "2025-06-01T00:00:00Z",
    "endDate": "2025-06-30T23:59:59Z"
  }
}
```

---

### Get Incomes by Category
Retrieves income breakdown by category.

**Endpoint:** `GET /summary/incomes/by-category`

**Headers:** `Authorization: Bearer <access_token>`

**Response format similar to expenses by category.

---

## 💰 Survival Budget Endpoints
*Requires Authentication*

### Create Survival Budget
Sets up a survival budget for a specific period.

**Endpoint:** `POST /budget/survival`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "amount": 1000.00,
  "startDate": "2025-07-01T00:00:00Z",
  "endDate": "2025-07-31T23:59:59Z"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "amount": 1000.00,
  "startDate": "2025-07-01T00:00:00Z",
  "endDate": "2025-07-31T23:59:59Z",
  "remainingAmount": 1000.00,
  "spentAmount": 0.00,
  "createdAt": "2025-06-29T14:30:00Z"
}
```

---

### Get Survival Budget
Retrieves current survival budget with spending progress.

**Endpoint:** `GET /budget/survival`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `date` (optional): Specific date to check budget for

**Response (200 OK):**
```json
{
  "id": 1,
  "amount": 1000.00,
  "startDate": "2025-07-01T00:00:00Z",
  "endDate": "2025-07-31T23:59:59Z",
  "spentAmount": 320.75,
  "remainingAmount": 679.25,
  "percentageUsed": 32.08,
  "daysRemaining": 18,
  "dailyBudgetRemaining": 37.74,
  "status": "on_track", // "on_track", "over_budget", "critical"
  "createdAt": "2025-06-29T14:30:00Z"
}
```

---

## 🔔 Notification Endpoints
*Requires Authentication*

### Save FCM Token
Saves a Firebase Cloud Messaging token for push notifications.

**Endpoint:** `POST /notifications/save-token`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response (200 OK):**
```json
{
  "message": "Token saved"
}
```

---

### Send Push Notification
Sends a push notification to the authenticated user.

**Endpoint:** `POST /notifications/send`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "title": "Transaction Alert",
  "body": "New expense detected - categorization needed",
  "data": {
    "messageId": "123",
    "amount": "50.00",
    "type": "expense",
    "actionRequired": true
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Notification sent"
}
```

---

## ⚡ Health Check

### Health Check
Checks if the API is running and healthy.

**Endpoint:** `GET /health`

**Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2025-06-29T14:30:00Z"
}
```

---

## 🔧 Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific field that caused the error"
  }
}
```

**Rate Limiting Error:**
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 60
}
```

**Validation Error:**
```json
{
  "error": "Password validation failed: Password must contain at least one uppercase letter, Password must contain at least one special character",
  "code": "VALIDATION_ERROR"
}
```

---

## 🛡️ Security Features

- **JWT Authentication** with short-lived access tokens (15 min) and refresh tokens (7 days)
- **Rate Limiting** to prevent abuse and brute force attacks
- **Account Lockout** after failed login attempts
- **Password Strength Validation** with comprehensive requirements
- **CORS Protection** with configurable allowed origins
- **Request Size Limits** to prevent DoS attacks
- **Automatic Token Cleanup** for expired refresh tokens

---

## 📚 SDK/Client Examples

### JavaScript/React Native Example
```javascript
// AuthService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  static async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      await AsyncStorage.setItem('accessToken', data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.refreshToken);
      return data;
    }
    throw new Error('Login failed');
  }
}
```

This documentation covers all the endpoints in your expense tracker API with detailed request/response examples, error handling, and security information.
