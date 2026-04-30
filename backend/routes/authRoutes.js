/**
 * Authentication Routes
 * Handles all authentication-related API endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers
const {
  register,
  verifyOTP,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword,
  getGoogleAuthUrl,
  googleAuthCallback,
  disconnectGoogle,
  refreshGoogleToken,
} = require('../controllers/authController');

// Import middleware
const { verifyToken, verifyRefreshToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('phone').optional().trim(),
];

const loginValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyEmailValidation = [
  body('token').notEmpty().withMessage('Token is required'),
];

const resendValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('New password must contain a number'),
];

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', registerValidation, asyncHandler(register));

// @route   POST /api/auth/verify-otp
// @desc    Verify user email with OTP
// @access  Public
router.post(
  '/verify-otp',
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
  ],
  asyncHandler(verifyOTP)
);

// @route   POST /api/auth/verify-email
// @desc    Verify user email (backward compatibility - token-based)
// @access  Public
router.post('/verify-email', verifyEmailValidation, asyncHandler(verifyEmail));

// @route   POST /api/auth/resend-otp
// @desc    Resend verification email
// @access  Public
router.post('/resend-otp', resendValidation, asyncHandler(resendVerification));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, asyncHandler(login));

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', asyncHandler(refreshToken));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', verifyToken, asyncHandler(logout));

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(forgotPassword));

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', resetPasswordValidation, asyncHandler(resetPassword));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyToken, asyncHandler(getMe));

// @route   POST /api/auth/change-password
// @desc    Change password
// @access  Private
router.post('/change-password', verifyToken, changePasswordValidation, asyncHandler(changePassword));

// ===========================================
// GOOGLE OAUTH ROUTES
// ===========================================

// @route   GET /api/auth/google/url
// @desc    Get Google OAuth authorization URL
// @access  Public
router.get('/google/url', asyncHandler(getGoogleAuthUrl));

// @route   POST /api/auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.post('/google/callback', [
  body('code').notEmpty().withMessage('Authorization code is required'),
  body('state').optional(),
], asyncHandler(googleAuthCallback));

// @route   POST /api/auth/google/disconnect
// @desc    Disconnect Google account
// @access  Private
router.post('/google/disconnect', verifyToken, asyncHandler(disconnectGoogle));

// @route   POST /api/auth/google/refresh
// @desc    Refresh Google access token
// @access  Private
router.post('/google/refresh', verifyToken, asyncHandler(refreshGoogleToken));

module.exports = router;
