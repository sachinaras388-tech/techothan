# Setup Instructions - AI-Powered Cyber Fraud Detection System

## Prerequisites

Before installing, ensure you have the following:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   
2. **Python** (v3.10 or higher)
   - Download from: https://www.python.org/
   
3. **MongoDB** (v6.0 or higher)
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud)
   
4. **Redis** (v7.0 or higher)
   - Download from: https://redis.io/download

---

## Backend Setup (Node.js)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
copy .env.example .env
```

Edit `.env` file with your settings:
```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/fraud_detection

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email (optional - for verification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Start MongoDB and Redis
```bash
# Start MongoDB (if local)
mongod

# Start Redis
redis-server
```

### 5. Start Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:5000`

---

## AI Service Setup (Python)

### 1. Navigate to AI Service Directory
```bash
cd ai-service
```

### 2. Create Virtual Environment
```bash
python -m venv venv
```

### 3. Activate Virtual Environment
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment
Create `.env` file:
```env
PORT=8000
AI_SERVICE_API_KEY=your-api-key
```

### 6. Start AI Service
```bash
python main.py
```

The AI service will run on `http://localhost:8000`

---

## Testing the Setup

### 1. Test Backend Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Fraud Detection System is running"
}
```

### 2. Test AI Service
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "models": {
    "text_classifier": "loaded",
    "url_scanner": "loaded",
    "upi_detector": "loaded"
  }
}
```

### 3. Test Text Analysis
```bash
curl -X POST http://localhost:5000/api/analyze/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Congratulations! You have won a lottery prize of Rs 10,00,000. Call now and share OTP."}'
```

---

## Common Issues and Solutions

### 1. MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`

### 2. Redis Connection Error
- Ensure Redis is running
- Check `REDIS_HOST` and `REDIS_PORT`

### 3. Port Already in Use
- Change port in `.env` file
- Kill process using the port: `fuser -k <port>/tcp`

### 4. npm install Error
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

### 5. Python Import Error
- Ensure virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`

---

## Running in Production

### 1. PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start server.js --name fraud-backend

# Start AI service
pm2 start main.py --name fraud-ai
```

### 2. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
    }

    location /ai/ {
        proxy_pass http://localhost:8000;
    }
}
```

---

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:5000/api
- ReDoc: http://localhost:5000/api/docs

---

## Next Steps

1. Set up frontend (React.js dashboard)
2. Configure email sending
3. Set up SSL certificates
4. Configure cloud storage (AWS S3)
5. Set up monitoring and logging

---

## Support

For issues and questions, please open an issue on GitHub.
