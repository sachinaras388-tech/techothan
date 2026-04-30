const { User } = require('../models/User');
const { ScanHistory } = require('../models/ScanHistory');
const { Alert, ALERT_STATUS } = require('../models/Alert');
const { FraudReport, REPORT_STATUS } = require('../models/FraudReport');
const logger = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

const getStats = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    // Get user-specific or global stats
    const userFilter = userId ? { userId } : {};

    // Get scan stats
    const scanStats = await ScanHistory.getStats();
    const scanByType = await ScanHistory.getStatsByType();

    // Get alert stats
    const alertStats = await Alert.getStats(userId);

    // Get user count
    const userStats = await User.getStats();

    // Get report stats (admin only)
    let reportStats = null;
    if (req.user?.role === 'admin' || req.user?.role === 'moderator') {
      reportStats = await FraudReport.getStats();
    }

    // Get recent alerts
    const recentAlerts = await Alert.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const response = {
      success: true,
      data: {
        scans: {
          total: scanStats.totalScans,
          safe: scanStats.safeScans,
          suspicious: scanStats.suspiciousScans,
          fraud: scanStats.fraudScans,
          threat: scanStats.threatScans,
          avgRiskScore: Math.round(scanStats.avgRiskScore || 0),
        },
        alerts: {
          total: alertStats.totalAlerts || recentAlerts.length,
          new: alertStats.newAlerts || 0,
          critical: alertStats.criticalAlerts || 0,
        },
        users: {
          total: userStats.totalUsers || 0,
          active: userStats.activeUsers || 0,
          verified: userStats.verifiedUsers || 0,
        },
        reports: reportStats,
        scanByType,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user dashboard data
 * GET /api/dashboard/user
 */
const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user stats
    const user = await User.findById(userId);

    // Get user's scan history
    const recentScans = await ScanHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get user's alerts
    const alerts = await Alert.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get unread alert count
    const unreadCount = await Alert.getUnreadCount(userId);

    // Get monthly scan data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyScans = await ScanHistory.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          fraud: { $sum: { $cond: [{ $eq: ['$result', 'fraud'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          stats: user.stats,
          googleConnected: !!user.googleAccessToken,
          googleTokenExpiry: user.googleTokenExpiry,
        },
        recentScans,
        alerts: alerts.map(a => ({
          id: a._id,
          title: a.title,
          message: a.message,
          type: a.type,
          severity: a.severity,
          status: a.status,
          createdAt: a.createdAt,
        })),
        unreadCount,
        monthlyScans,
        emailStats: {
          totalScans: user.stats?.emailScans || 0,
          fraudDetected: user.stats?.emailFraud || 0,
          safeEmails: (user.stats?.emailScans || 0) - (user.stats?.emailFraud || 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's scan history
 * GET /api/dashboard/scans
 */
const getScanHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, result } = req.query;

    // Build filter
    const filter = { userId };
    if (type) filter.type = type;
    if (result) filter.result = result;

    // Get scans
    const scans = await ScanHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await ScanHistory.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        scans,
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
 * Get user's alerts
 * GET /api/dashboard/alerts
 */
const getAlerts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, status, severity, type } = req.query;

    // Build filter
    const filter = { userId };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    // Get alerts
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Alert.countDocuments(filter);

    // Get unread count
    const unreadCount = await Alert.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: {
        alerts,
        unreadCount,
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
 * Mark alerts as read
 * PUT /api/dashboard/alerts/read
 */
const markAlertsAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds)) {
      throw new APIError('Alert IDs are required', 400);
    }

    await Alert.markAsRead(alertIds, userId);

    res.status(200).json({
      success: true,
      message: 'Alerts marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Acknowledge alert
 * PUT /api/dashboard/alerts/:id/acknowledge
 */
const acknowledgeAlert = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const alert = await Alert.findOne({ _id: id, userId });

    if (!alert) {
      throw new APIError('Alert not found', 404);
    }

    alert.status = ALERT_STATUS.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    await alert.save();

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged',
      data: { alert },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getUserDashboard,
  getScanHistory,
  getAlerts,
  markAlertsAsRead,
  acknowledgeAlert,
};
