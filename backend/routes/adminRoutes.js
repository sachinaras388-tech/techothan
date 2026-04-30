/**
 * Admin Routes
 * Handles admin-only endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getReports,
  updateReport,
  getLogs,
  getSystemStats,
} = require('../controllers/adminController');

// Import middleware
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin, isAdminOrModerator } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', verifyToken, isAdmin, asyncHandler(getUsers));

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/users/:id', verifyToken, isAdmin, asyncHandler(getUserById));

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Admin
router.put('/users/:id', verifyToken, isAdmin, [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('role').optional().isIn(['user', 'moderator', 'admin']),
], asyncHandler(updateUser));

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', verifyToken, isAdmin, asyncHandler(deleteUser));

// @route   GET /api/admin/reports
// @desc    Get all reports
// @access  Admin/Moderator
router.get('/reports', verifyToken, isAdminOrModerator, asyncHandler(getReports));

// @route   PUT /api/admin/reports/:id
// @desc    Update report
// @access  Admin/Moderator
router.put('/reports/:id', verifyToken, isAdminOrModerator, [
  body('status').optional().isIn(['pending', 'investigating', 'verified', 'resolved', 'rejected']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
], asyncHandler(updateReport));

// @route   GET /api/admin/logs
// @desc    Get system logs
// @access  Admin
router.get('/logs', verifyToken, isAdmin, asyncHandler(getLogs));

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Admin
router.get('/stats', verifyToken, isAdmin, asyncHandler(getSystemStats));

module.exports = router;
