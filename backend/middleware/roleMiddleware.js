/**
 * Role-Based Access Control Middleware
 * Handles authorization based on user roles
 */

const { USER_ROLES } = require('../models/User');

/**
 * Check if user has required role
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = checkRole(USER_ROLES.ADMIN);

/**
 * Check if user is admin or moderator
 */
const isAdminOrModerator = checkRole(USER_ROLES.ADMIN, USER_ROLES.MODERATOR);

/**
 * Check if user is verified
 */
const isVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email to access this resource.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
};

/**
 * Check if account is active
 */
const isActive = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated.',
    });
  }

  if (req.user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been blocked.',
    });
  }

  next();
};

module.exports = {
  checkRole,
  isAdmin,
  isAdminOrModerator,
  isVerified,
  isActive,
  USER_ROLES,
};
