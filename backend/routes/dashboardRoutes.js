/**
 * Dashboard Routes
 * Handles dashboard and user data endpoints
 */

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

// Import controllers
const {
  getStats,
  getUserDashboard,
  getScanHistory,
  getAlerts,
  markAlertsAsRead,
  acknowledgeAlert,
} = require('../controllers/dashboardController');

// Import middleware
const { verifyToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/dashboard/stats
// @desc    Get global statistics
// @access  Private (optional auth for global vs user-specific)
router.get('/stats', verifyToken, asyncHandler(getStats));

// @route   GET /api/dashboard/user
// @desc    Get user dashboard data
// @access  Private
router.get('/user', verifyToken, asyncHandler(getUserDashboard));

// @route   GET /api/dashboard/scans
// @desc    Get user scan history
// @access  Private
router.get('/scans', verifyToken, asyncHandler(getScanHistory));

// @route   GET /api/dashboard/alerts
// @desc    Get user alerts
// @access  Private
router.get('/alerts', verifyToken, asyncHandler(getAlerts));

// @route   PUT /api/dashboard/alerts/read
// @desc    Mark alerts as read
// @access  Private
router.put('/alerts/read', verifyToken, [
  body('alertIds')
    .isArray({ min: 1 })
    .withMessage('Alert IDs are required'),
], asyncHandler(markAlertsAsRead));

// @route   PUT /api/dashboard/alerts/:id/acknowledge
// @desc    Acknowledge alert
// @access  Private
router.put('/alerts/:id/acknowledge', verifyToken, asyncHandler(acknowledgeAlert));

module.exports = router;
