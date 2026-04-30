/**
 * Analyze Routes
 * Handles all fraud detection analysis endpoints
 */

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

// Import controllers
const {
  analyzeText,
  analyzeUrl,
  analyzeUpi,
  analyzePhone,
  // New scam detection controllers
  analyzeTextScam,
  analyzePhoneScam,
  analyzeEmailScam,
  detectScamAll,
  analyzeGmail,
  analyzeGmailMessage,
  getGmailStats,
} = require('../controllers/analyzeController');

// Import URL Check controller
const { checkUrl } = require('../controllers/urlCheckController');

// Import middleware
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation rules
const textValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Text content is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Text must be between 10 and 5000 characters'),
];

const urlValidation = [
  body('url')
    .trim()
    .notEmpty()
    .withMessage('URL is required')
    .isURL()
    .withMessage('Please enter a valid URL'),
];

const upiValidation = [
  body('upiId')
    .trim()
    .notEmpty()
    .withMessage('UPI ID is required')
    .matches(/^[a-zA-Z0-9@.-]+$/)
    .withMessage('Invalid UPI ID format'),
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number'),
  body('merchantName').optional().trim(),
  body('transactionNote').optional().trim(),
];

const phoneValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s-]{10,15}$/)
    .withMessage('Invalid phone number format'),
  body('context').optional().trim(),
];

// @route   POST /api/analyze/text
// @desc    Analyze text for fraud detection
// @access  Private (optional auth)
router.post('/text', optionalAuth, textValidation, asyncHandler(analyzeText));

// @route   POST /api/analyze/url
// @desc    Analyze URL for scam detection
// @access  Private (optional auth)
router.post('/url', optionalAuth, urlValidation, asyncHandler(analyzeUrl));

// @route   POST /api/analyze/upi
// @desc    Analyze UPI payment request
// @access  Private
router.post('/upi', verifyToken, upiValidation, asyncHandler(analyzeUpi));

// @route   POST /api/analyze/phone
// @desc    Analyze phone number for scam detection
// @access  Private (optional auth)
router.post('/phone', optionalAuth, phoneValidation, asyncHandler(analyzePhone));

// ===========================================
// NEW SCAM DETECTION ROUTES
// ===========================================

// @route   POST /api/analyze-text
// @desc   Analyze text for scam keywords
// @access Private
router.post('/analyze-text', verifyToken, asyncHandler(analyzeTextScam));

// @route   POST /api/analyze-phone
// @desc   Analyze phone number for scam patterns
// @access Private
router.post('/analyze-phone', verifyToken, asyncHandler(analyzePhoneScam));

// @route   POST /api/analyze-email
// @desc   Analyze email for suspicious patterns
// @access Private
router.post('/analyze-email', verifyToken, asyncHandler(analyzeEmailScam));

// @route   POST /api/detect-scam
// @desc   Combined scam detection
// @access Private
router.post('/detect-scam', verifyToken, asyncHandler(detectScamAll));

// ===========================================
// REAL-TIME LINK CHECK (NEW)
// ===========================================

// @route   POST /api/check-url
// @desc   Check if URL is safe or unsafe before navigation
// @access  Private (optional auth for flexibility)
router.post('/check-url', optionalAuth, asyncHandler(checkUrl));

// ===========================================
// GMAIL ANALYSIS ROUTES
// ===========================================

// @route   GET /api/analyze/gmail/stats
// @desc   Get Gmail analysis statistics
// @access  Private
router.get('/gmail/stats', verifyToken, asyncHandler(getGmailStats));

// @route   POST /api/analyze/gmail
// @desc   Analyze Gmail emails for fraud
// @access  Private
router.post('/gmail', verifyToken, [
  query('maxResults').optional().isInt({ min: 1, max: 100 }).withMessage('maxResults must be between 1 and 100'),
  query('daysBack').optional().isInt({ min: 1, max: 365 }).withMessage('daysBack must be between 1 and 365'),
], asyncHandler(analyzeGmail));

// @route   POST /api/analyze/gmail/message
// @desc   Analyze single Gmail message
// @access  Private
router.post('/gmail/message', verifyToken, [
  body('messageId').notEmpty().withMessage('Message ID is required'),
], asyncHandler(analyzeGmailMessage));

module.exports = router;
