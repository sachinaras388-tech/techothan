/**
 * Error Handler Middleware
 * Handles application errors and responses
 */

const logger = require('../utils/logger');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new APIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500,
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = {
      success: false,
      message: messages.join(', '),
      statusCode: 400,
      errors: err.errors,
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      success: false,
      message: `A record with this ${field} already exists.`,
      statusCode: 400,
    };
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = {
      success: false,
      message: 'Invalid ID format.',
      statusCode: 400,
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token.',
      statusCode: 401,
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired.',
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
    };
  }

  // Multer file upload errors
  if (err.code === 'LIMIT\_FILE\_SIZE') {
    error = {
      success: false,
      message: 'File size exceeds the limit.',
      statusCode: 400,
    };
  }

  if (err.code === 'LIMIT\_UNEXPECTED\_FILE') {
    error = {
      success: false,
      message: 'Unexpected file field.',
      statusCode: 400,
    };
  }

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
    error.details = err.details || null;
  }

  // Send response
  res.status(error.statusCode).json({
    success: error.success,
    message: error.message,
    ...(error.stack && process.env.NODE_ENV === 'development' && { stack: error.stack }),
    ...(error.errors && { errors: error.errors }),
    ...(error.code && { code: error.code }),
  });
};

/**
 * Async handler wrapper
 * Handles async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler
 */
const validationErrorHandler = (errors) => {
  const messages = errors.array().map((e) => e.msg);
  const error = new APIError(messages.join(', '), 400, 'VALIDATION_ERROR');
  return error;
};

module.exports = {
  APIError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validationErrorHandler,
};
