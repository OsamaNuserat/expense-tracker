# API Testing Guide

## Overview
This guide provides comprehensive instructions for testing the Expense Tracker API using various tools and methods.

## Environment URLs
- **Development**: http://localhost:3000/api
- **Production**: https://expense-tracker-q432.onrender.com/api

## Quick Start with Swagger UI

### 1. Access Swagger Documentation
- **Development**: http://localhost:3000/api-docs
- **Production**: https://expense-tracker-q432.onrender.com/api-docs

Open either URL in your browser to access the interactive API documentation.

### 2. Authentication Testing
1. **Register a new user**:
   - Navigate to "Authentication" section
   - Expand "POST /auth/register"
   - Click "Try it out"
   - Enter test credentials:
     ```json
     {
       "email": "test@example.com",
       "password": "TestPass123!"
     }
     ```
   - Click "Execute"
   - Copy the `accessToken` from the response

2. **Authorize for protected endpoints**:
   - Click the "Authorize" button at the top of the page
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
   - Click "Authorize"

3. **Test protected endpoints**:
   - All protected endpoints will now use your token automatically

## Postman Integration

### Import Collection
1. **Development**: Download from http://localhost:3000/api-docs/postman
2. **Production**: Download from https://expense-tracker-q432.onrender.com/api-docs/postman
3. Open Postman
4. Click "Import" → "Upload Files"
5. Select the downloaded collection file

### Environment Setup
Create environments for both development and production:

**Development Environment:**
```
baseUrl: http://localhost:3000/api
accessToken: (leave empty initially)
refreshToken: (leave empty initially)
```

**Production Environment:**
```
baseUrl: https://expense-tracker-q432.onrender.com/api
accessToken: (leave empty initially)
refreshToken: (leave empty initially)
```

### Authentication Flow
1. **Register/Login**:
   - Use "Authentication" → "Register User" or "Login User"
   - Copy tokens from response
   - Set `accessToken` and `refreshToken` in environment

2. **Auto-token management**:
   - Add this script to the "Tests" tab of login requests:
   ```javascript
   if (pm.response.code === 200 || pm.response.code === 201) {
     const response = pm.response.json();
     pm.environment.set("accessToken", response.accessToken);
     pm.environment.set("refreshToken", response.refreshToken);
   }
   ```

## cURL Examples

### Authentication
```bash
# Register (Development)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Register (Production)
curl -X POST https://expense-tracker-q432.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Login (Development)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Login (Production)
curl -X POST https://expense-tracker-q432.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Refresh Token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

### Protected Endpoints
```bash
# Get Categories (requires auth)
curl -X GET http://localhost:3000/api/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Parse Message
curl -X POST http://localhost:3000/api/messages/parse \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "CLIQ: You received 100.00 JOD from Ahmad Ali"
  }'

# Get Summary
curl -X GET http://localhost:3000/api/summary?timeframe=month \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## JavaScript/Node.js Testing

### Basic Setup
```javascript
// Environment configuration
const environments = {
  development: 'http://localhost:3000/api',
  production: 'https://expense-tracker-q432.onrender.com/api'
};

const baseURL = environments.development; // or environments.production
let accessToken = '';

// Helper function for authenticated requests
async function apiRequest(endpoint, options = {}) {
  const url = `${baseURL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

// Authentication
async function login(email, password) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  accessToken = response.accessToken;
  return response;
}
```

### Example Test Suite
```javascript
// Jest test example
describe('Expense Tracker API', () => {
  beforeAll(async () => {
    // Register test user
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPass123!'
      })
    });
    
    // Login to get token
    await login('test@example.com', 'TestPass123!');
  });
  
  test('should parse SMS message', async () => {
    const response = await apiRequest('/messages/parse', {
      method: 'POST',
      body: JSON.stringify({
        content: 'CLIQ: You received 100.00 JOD from Ahmad Ali'
      })
    });
    
    expect(response.parsedData).toBeDefined();
    expect(response.parsedData.amount).toBe(100);
  });
  
  test('should get categories', async () => {
    const response = await apiRequest('/categories');
    expect(Array.isArray(response)).toBe(true);
  });
});
```

## Python Testing

### Using requests library
```python
import requests
import json

class ExpenseTrackerAPI:
    def __init__(self, environment='development'):
        self.environments = {
            'development': 'http://localhost:3000/api',
            'production': 'https://expense-tracker-q432.onrender.com/api'
        }
        self.base_url = self.environments[environment]
        self.access_token = None
    
    def request(self, endpoint, method='GET', data=None):
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        response = requests.request(
            method, url, 
            headers=headers,
            json=data if data else None
        )
        
        response.raise_for_status()
        return response.json()
    
    def login(self, email, password):
        response = self.request('/auth/login', 'POST', {
            'email': email,
            'password': password
        })
        self.access_token = response['accessToken']
        return response

# Usage example
api_dev = ExpenseTrackerAPI('development')  # For local testing
api_prod = ExpenseTrackerAPI('production')  # For production testing

api_dev.login('test@example.com', 'TestPass123!')
categories = api_dev.request('/categories')
print(f"Found {len(categories)} categories")
```

## Rate Limiting Testing

### Authentication Endpoints (5 requests per 15 minutes)
```bash
# Test rate limiting
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrong"}' \
    -w "Status: %{http_code}\n"
  sleep 1
done
```

### General API Endpoints (60 requests per minute)
```bash
# Test general rate limiting
for i in {1..65}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:3000/health
done
```

## Error Handling Testing

### Common Error Scenarios
```bash
# 400 - Bad Request
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'

# 401 - Unauthorized
curl -X GET http://localhost:3000/api/categories

# 409 - Conflict (duplicate email)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "TestPass123!"
  }'

# 423 - Account Locked (after 5 failed attempts)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrongpassword"
    }'
done
```

## Performance Testing

### Load Testing with curl
```bash
# Simple load test
seq 1 100 | xargs -n1 -P10 -I{} \
  curl -s -o /dev/null -w "Request {}: %{time_total}s\n" \
  http://localhost:3000/health
```

### Using Apache Bench
```bash
# Install apache2-utils if needed
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test with auth (create token first)
ab -n 100 -c 5 -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/categories
```

## Automated Testing Scripts

### Bash Test Runner
```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"
EMAIL="test@example.com"
PASSWORD="TestPass123!"

echo "🧪 Running API Tests..."

# Test health endpoint
echo "Testing health endpoint..."
curl -s $BASE_URL/../health | jq '.status' || exit 1

# Test registration
echo "Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" != "null" ]; then
  echo "✅ Registration successful"
else
  echo "❌ Registration failed"
  exit 1
fi

# Test protected endpoint
echo "Testing protected endpoint..."
CATEGORIES=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  $BASE_URL/categories)

if [ $(echo $CATEGORIES | jq 'length') -gt 0 ]; then
  echo "✅ Categories retrieved successfully"
else
  echo "❌ Failed to retrieve categories"
  exit 1
fi

echo "🎉 All tests passed!"
```

## Monitoring and Debugging

### Enable Debug Logging
```bash
# Start server with debug logging
DEBUG=* npm start

# Or specific modules
DEBUG=express:* npm start
```

### API Response Time Monitoring
```javascript
// Add to your test suite
function timeRequest(fn) {
  return async (...args) => {
    const start = Date.now();
    const result = await fn(...args);
    const duration = Date.now() - start;
    console.log(`Request took ${duration}ms`);
    return result;
  };
}

const timedApiRequest = timeRequest(apiRequest);
```

## Troubleshooting Common Issues

### 1. CORS Errors
- Ensure your origin is in `ALLOWED_ORIGINS` environment variable
- Check that credentials are included in requests

### 2. JWT Token Issues
- Verify token format: `Bearer <token>`
- Check token expiration (15 minutes for access tokens)
- Use refresh token to get new access token

### 3. Rate Limiting
- Wait for the rate limit window to reset
- Use different IPs for testing if needed
- Check rate limit headers in responses

### 4. Database Connection
- Ensure PostgreSQL is running
- Verify DATABASE_URL environment variable
- Run Prisma migrations if needed

### 5. Environment Variables
- Copy `.env.example` to `.env`
- Set all required variables
- Restart server after changes

This testing guide provides comprehensive coverage for all aspects of the Expense Tracker API testing process.
