require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const  dns= require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); 

const config = require('./config/env');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

const authRoutes = require('./routes/authRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const { initializeSocket } = require('./sockets');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Fraud Detection System is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI-Powered Cyber Fraud Detection API',
    version: config.apiVersion,
    endpoints: {
      auth: '/api/auth',
      analyze: '/api/analyze',
      dashboard: '/api/dashboard',
      admin: '/api/admin',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without Redis:', redisError.message);
    }

    initializeSocket(server);
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API Version: ${config.apiVersion}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server };
