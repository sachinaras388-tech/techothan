const { validationResult } = require('express-validator');
const { User, USER_ROLES } = require('../models/User');
const { ScanHistory } = require('../models/ScanHistory');
const { Alert, ALERT_STATUS } = require('../models/Alert');
const { FraudReport, REPORT_STATUS } = require('../models/FraudReport');
const { ActivityLog, ACTIVITY_TYPES } = require('../models/ActivityLog');
const logger = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, isVerified, isActive, search } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Get users
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (admin)
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -refreshToken');

    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Get user's scan history
    const recentScans = await ScanHistory.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get user's reports
    const reports = await FraudReport.find({ reporterId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        user,
        recentScans,
        reports,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (admin)
 * PUT /api/admin/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { id } = req.params;
    const { firstName, lastName, role, isActive, isBlocked, isVerified } = req.body;

    const user = await User.findById(id);

    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (isBlocked !== undefined) user.isBlocked = isBlocked;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.user._id,
      type: ACTIVITY_TYPES.ADMIN_ACTION,
      description: `Updated user ${user.email}`,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
    });

    logger.info('User updated by admin:', { adminId: req.user._id, userId: id });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (admin)
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user._id.toString()) {
      throw new APIError('Cannot delete your own account', 400);
    }

    const user = await User.findById(id);

    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Soft delete (deactivate)
    user.isActive = false;
    user.isBlocked = true;
    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.user._id,
      type: ACTIVITY_TYPES.ADMIN_ACTION,
      description: `Deleted user ${user.email}`,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
    });

    logger.info('User deleted by admin:', { adminId: req.user._id, userId: id });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reports (admin)
 * GET /api/admin/reports
 */
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, severity } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    // Get reports
    const reports = await FraudReport.find(filter)
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await FraudReport.countDocuments(filter);

    // Get stats
    const stats = await FraudReport.getStats();
    const byType = await FraudReport.getStatsByType();

    res.status(200).json({
      success: true,
      data: {
        reports,
        stats,
        byType,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update report (admin)
 * PUT /api/admin/reports/:id
 */
const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, severity, assignedTo, notes, actionTaken, resolutionNotes } = req.body;

    const report = await FraudReport.findById(id);

    if (!report) {
      throw new APIError('Report not found', 404);
    }

    // Update fields
    if (status) {
      report.status = status;
      if (status === REPORT_STATUS.INVESTIGATING && !report.investigatedAt) {
        report.investigatedAt = new Date();
      }
      if (status === REPORT_STATUS.VERIFIED && !report.verifiedAt) {
        report.verifiedAt = new Date();
      }
      if (status === REPORT_STATUS.RESOLVED) {
        report.resolvedAt = new Date();
        report.resolvedBy = req.user._id;
      }
    }
    if (severity) report.severity = severity;
    if (assignedTo) report.assignedTo = assignedTo;
    if (notes) report.investigation.notes = notes;
    if (actionTaken) report.investigation.actionTaken = actionTaken;
    if (resolutionNotes) report.resolutionNotes = resolutionNotes;

    await report.save();

    logger.info('Report updated by admin:', { adminId: req.user._id, reportId: id });

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system logs (admin)
 * GET /api/admin/logs
 */
const getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get logs
    const logs = await ActivityLog.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await ActivityLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system statistics (admin)
 * GET /api/admin/stats
 */
const getSystemStats = async (req, res, next) => {
  try {
    // Get all stats
    const userStats = await User.getStats();
    const scanStats = await ScanHistory.getStats();
    const alertStats = await Alert.getStats();
    const reportStats = await FraudReport.getStats();
    const scanByType = await ScanHistory.getStatsByType();
    const reportByType = await FraudReport.getStatsByType();

    // Get system health
    const systemHealth = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };

    res.status(200).json({
      success: true,
      data: {
        users: userStats,
        scans: scanStats,
        alerts: alertStats,
        reports: reportStats,
        scanByType,
        reportByType,
        systemHealth,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getReports,
  updateReport,
  getLogs,
  getSystemStats,
};
