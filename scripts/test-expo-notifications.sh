#!/bin/bash

# Expo Notifications Testing Script
# This script tests the Expo notification endpoints

BASE_URL="http://localhost:3000/api"
AUTH_TOKEN="your-jwt-token-here"  # Replace with actual JWT token
EXPO_TOKEN="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"  # Replace with actual Expo token

echo "🧪 Testing Expo Notifications Integration"
echo "========================================="

# Test 1: Save Expo Push Token
echo ""
echo "1️⃣  Testing: Save Expo Push Token"
curl -X POST "$BASE_URL/notifications/save-token" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"expoPushToken\": \"$EXPO_TOKEN\"}" \
  -w "\nStatus: %{http_code}\n"

# Test 2: Get Notification Settings  
echo ""
echo "2️⃣  Testing: Get Notification Settings"
curl -X GET "$BASE_URL/notifications/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# Test 3: Update Notification Settings
echo ""
echo "3️⃣  Testing: Update Notification Settings"
curl -X PUT "$BASE_URL/notifications/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "budgetAlerts": true,
    "transactionAlerts": true,
    "recurringPaymentReminders": true
  }' \
  -w "\nStatus: %{http_code}\n"

# Test 4: Send Test Notification
echo ""
echo "4️⃣  Testing: Send Test Notification"
curl -X POST "$BASE_URL/notifications/test" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# Test 5: Send Custom Notification
echo ""
echo "5️⃣  Testing: Send Custom Notification"
curl -X POST "$BASE_URL/notifications/send" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 Migration Test",
    "body": "Expo notifications are working perfectly!",
    "data": {
      "type": "test",
      "source": "migration_test"
    },
    "options": {
      "priority": "high",
      "channelId": "default"
    }
  }' \
  -w "\nStatus: %{http_code}\n"

# Test 6: Remove Push Token
echo ""
echo "6️⃣  Testing: Remove Push Token"
curl -X DELETE "$BASE_URL/notifications/remove-token" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "✅ Expo Notifications Testing Complete!"
echo ""
echo "📝 Notes:"
echo "- Replace AUTH_TOKEN with a valid JWT token"
echo "- Replace EXPO_TOKEN with a valid Expo push token"
echo "- All endpoints should return status 200 for success"
echo "- Status 401 indicates authentication issues"
echo "- Status 400 indicates request validation issues"
