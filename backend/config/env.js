require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_detection',
  mongoHost: process.env.MONGODB_HOST || 'localhost',
  mongoPort: process.env.MONGODB_PORT || 27017,
  mongoDatabase: process.env.MONGODB_DATABASE || 'fraud_detection',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  jwtExpire: process.env.JWT_EXPIRE || '15m',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Email
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: process.env.SMTP_PORT || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || 'FraudShield <noreply@fraudshield.com>',

  // AI Service
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY,

  // AWS
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsS3Bucket: process.env.AWS_S3_BUCKET || 'fraud-detection-logs',

  // Rate Limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Security
  bcryptRound: parseInt(process.env.BCRYPT_ROUND) || 12,
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/app.log',
};

module.exports = config;
