# AI-Powered Cyber Fraud Detection & Prevention System

## API Documentation

---

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Request:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "+911234567890"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "isVerified": false
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 2. Verify Email
**POST** `/auth/verify-email`

Request:
```json
{
  "token": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 3. Login
**POST** `/auth/login`

Request:
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 4. Refresh Token
**POST** `/auth/refresh-token`

Request:
```json
{
  "refreshToken": "..."
}
```

---

### 5. Forgot Password
**POST** `/auth/forgot-password`

Request:
```json
{
  "email": "john@example.com"
}
```

---

### 6. Reset Password
**POST** `/auth/reset-password`

Request:
```json
{
  "token": "123456",
  "password": "NewPassword123"
}
```

---

### 7. Get Current User
**GET** `/auth/me`

Requires: Bearer Token

Response:
```json
{
  "success": true,
  "data": {
    "user": {...}
  }
}
```

---

## Analysis Endpoints

### 8. Analyze Text
**POST** `/analyze/text`

Requires: Bearer Token (optional)

Request:
```json
{
  "text": "Congratulations! You've won a lottery prize of ₹10,00,000. Claim now by sharing your OTP."
}
```

Response:
```json
{
  "success": true,
  "message": "Potential fraud detected",
  "data": {
    "scan": {
      "id": "...",
      "type": "text",
      "result": "fraud",
      "riskScore": 85,
      "confidence": 0.85
    },
    "analysis": {
      "isFraud": true,
      "type": "scam",
      "confidence": 0.85,
      "riskScore": 85,
      "recommendations": [
        "Do not respond to this message",
        "Do not share personal information"
      ]
    }
  }
}
```

---

### 9. Analyze URL
**POST** `/analyze/url`

Requires: Bearer Token (optional)

Request:
```json
{
  "url": "https://fake-bank-secure-login.com/account/verify"
}
```

Response:
```json
{
  "success": true,
  "message": "Dangerous URL detected",
  "data": {
    "analysis": {
      "isScam": true,
      "riskScore": 85,
      "reason": "Phishing domain",
      "recommendations": [...]
    }
  }
}
```

---

### 10. Analyze UPI
**POST** `/analyze/upi`

Requires: Bearer Token

Request:
```json
{
  "upiId": "giftclaim@amazon",
  "amount": 1,
  "merchantName": "Amazon Gift Claim"
}
```

Response:
```json
{
  "success": true,
  "message": "Potential UPI scam detected",
  "data": {
    "analysis": {
      "isFraud": true,
      "riskScore": 75,
      "warning": "Fake gift/promo scam"
    }
  }
}
```

---

### 11. Analyze Phone
**POST** `/analyze/phone`

Requires: Bearer Token (optional)

Request:
```json
{
  "phoneNumber": "+919876543210",
  "context": "Caller claiming to be bank"
}
```

---

## Dashboard Endpoints

### 12. Get Statistics
**GET** `/dashboard/stats`

Requires: Bearer Token (optional for global vs user)

Response:
```json
{
  "success": true,
  "data": {
    "scans": {
      "total": 1500,
      "safe": 1200,
      "fraud": 300
    },
    "users": {
      "total": 500,
      "active": 450
    }
  }
}
```

---

### 13. Get User Dashboard
**GET** `/dashboard/user`

Requires: Bearer Token

---

### 14. Get User Alerts
**GET** `/dashboard/alerts`

Requires: Bearer Token

---

### 15. Mark Alerts as Read
**PUT** `/dashboard/alerts/read`

Requires: Bearer Token

Request:
```json
{
  "alertIds": ["...", "..."]
}
```

---

## Admin Endpoints

### 16. Get All Users
**GET** `/admin/users`

Requires: Admin Role

### 17. Get System Stats
**GET** `/admin/stats`

Requires: Admin Role

### 18. Get Reports
**GET** `/admin/reports`

Requires: Admin/Moderator Role

### 19. Update Report
**PUT** `/admin/reports/:id`

Requires: Admin/Moderator Role

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'access_token' }
});
```

### Events

- `fraud_detected` - When fraud is detected
- `new_alert` - New alert for user
- `broadcast_alert` - System-wide alert
- `suspicious_activity` - Suspicious activity detected

---

## Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE" // optional
}
```

Common status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Analysis endpoints: 30 requests per minute
- Other endpoints: 100 requests per minute
