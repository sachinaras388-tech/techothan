const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Client connected:', {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    socket.on('join_alerts', () => {
      socket.join('alerts');
      logger.info('User joined alerts room:', { userId: socket.userId });
    });

    socket.on('leave_alerts', () => {
      socket.leave('alerts');
      logger.info('User left alerts room:', { userId: socket.userId });
    });

    socket.on('scan_request', (data) => {
      io.to('admins').emit('scan_request', {
        ...data,
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected:', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    });

    socket.on('error', (error) => {
      logger.error('Socket error:', {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  logger.info('Socket.io initialized');
  
  return io;
};

/**
 * Get IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit fraud detected event
 */
const emitFraudDetected = (data) => {
  if (!io) return;
  
  io.emit('fraud_detected', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit suspicious activity event
 */
const emitSuspiciousActivity = (data) => {
  if (!io) return;
  
  io.emit('suspicious_activity', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send alert to specific user
 */
const sendAlertToUser = (userId, alert) => {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('new_alert', {
    ...alert,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast alert to all connected users
 */
const broadcastAlert = (alert) => {
  if (!io) return;
  
  io.to('alerts').emit('broadcast_alert', {
    ...alert,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify admin of new report
 */
const notifyAdmins = (report) => {
  if (!io) return;
  
  io.to('admins').emit('new_report', {
    ...report,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  initializeSocket,
  getIO,
  emitFraudDetected,
  emitSuspiciousActivity,
  sendAlertToUser,
  broadcastAlert,
  notifyAdmins,
};
