const { validationResult } = require('express-validator');
const { User } = require('../models/User');
const { VerificationToken, TOKEN_TYPES } = require('../models/VerificationToken');
const { generateTokens, verifyRefreshToken } = require('../middleware/authMiddleware');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const logger = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { firstName, lastName, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new APIError('User with this email already exists', 400);
    }

    // Create new user (not verified)
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone,
      isVerified: false,
    });

    // Generate 6-digit OTP
    const otp = VerificationToken.generateOTP();
    
    // Create verification token with 5-minute expiry
    await VerificationToken.create({
      userId: user._id,
      token: otp,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Send OTP via email
    await sendVerificationEmail(user, otp);

    logger.info('OTP sent for registration:', { userId: user._id, email: user.email });

    // Response - OTP sent, no tokens yet
    res.status(201).json({
      success: true,
      message: 'OTP sent to email',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          email: user.email,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email with OTP (6-digit)
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new APIError('Email and OTP are required', 400);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Find valid OTP token
    const verificationToken = await VerificationToken.findValidToken(
      user._id,
      otp,
      TOKEN_TYPES.EMAIL_VERIFICATION
    );

    if (!verificationToken) {
      throw new APIError('Invalid or expired OTP', 400);
    }

    // Update user verification status
    user.isVerified = true;
    await user.save();

    // Mark token as used
    verificationToken.isUsed = true;
    await verificationToken.save();

// Cleanup old tokens
    await VerificationToken.cleanupExpired(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

// Generate JWT token
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpire }
    );
    user.refreshToken = refreshToken;
    await user.save();

    logger.info('Email verified with OTP:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email (backward compatibility - token-based)
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new APIError('Verification token is required', 400);
    }

    // Find verification token
    const verificationToken = await VerificationToken.findValidToken(
      null,
      token,
      TOKEN_TYPES.EMAIL_VERIFICATION
    );

    if (!verificationToken) {
      throw new APIError('Invalid or expired verification token', 400);
    }

    // Find and update user
    const user = await User.findById(verificationToken.userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Update user verification status
    user.isVerified = true;
    await user.save();

    // Mark token as used
    verificationToken.isUsed = true;
    await verificationToken.save();

// Cleanup old tokens
    await VerificationToken.cleanupExpired(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

// Generate JWT token
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpire }
    );
    user.refreshToken = refreshToken;
    await user.save();

    logger.info('Email verified:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isVerified: user.isVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification OTP
 * POST /api/auth/resend-otp
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new APIError('Email is required', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new APIError('User not found', 404);
    }

    if (user.isVerified) {
      throw new APIError('Email already verified', 400);
    }

    // Cleanup old tokens
    await VerificationToken.cleanupExpired(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

    // Generate new 6-digit OTP
    const otp = VerificationToken.generateOTP();
    
    // Generate new verification token with 5-minute expiry
    await VerificationToken.create({
      userId: user._id,
      token: otp,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Send verification OTP
    await sendVerificationEmail(user, otp);

    logger.info('Verification OTP resent:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'OTP sent to email',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new APIError('Invalid credentials', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      throw new APIError('Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new APIError(
        'Account is locked. Please try again later.',
        403
      );
    }

// Check if active (allow login even if not email verified)
    if (!user.isActive) {
      throw new APIError('Account is deactivated', 403);
    }

    // Check if blocked
    if (user.isBlocked) {
      throw new APIError('Account is blocked', 403);
    }

    // Reset login attempts
    await user.updateOne({
      $set: { loginAttempts: 0, lastLogin: new Date() },
      $unset: { lockUntil: '' },
    });

// Generate JWT token
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    // Update refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpire }
    );
    user.refreshToken = refreshToken;
    await user.save();

    logger.info('User logged in:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new APIError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = require('jsonwebtoken').verify(
      refreshToken,
      require('../config/env').jwtRefreshSecret
    );

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Clear refresh token
    if (req.user) {
      req.user.refreshToken = null;
      await req.user.save();
    }

    logger.info('User logged out:', { userId: req.user?._id });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new APIError('Email is required', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link will be sent.',
      });
    }

    // Generate reset token
    const resetToken = await VerificationToken.create({
      userId: user._id,
      token: VerificationToken.generateToken(),
      type: TOKEN_TYPES.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Send reset email
    await sendPasswordResetEmail(user, resetToken.token);

    logger.info('Password reset requested:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link will be sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new APIError('Token and new password are required', 400);
    }

    if (password.length < 8) {
      throw new APIError('Password must be at least 8 characters', 400);
    }

    // Find verification token
    const resetToken = await VerificationToken.findValidToken(
      null,
      token,
      TOKEN_TYPES.PASSWORD_RESET
    );

    if (!resetToken) {
      throw new APIError('Invalid or expired reset token', 400);
    }

    // Find user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Check if new password is same as old
    const isSame = await user.comparePassword(password);
    if (isSame) {
      throw new APIError('New password must be different from old password', 400);
    }

    // Update password
    user.password = password;
    user.refreshToken = null;
    await user.save();

    // Mark token as used
    resetToken.isUsed = true;
    await resetToken.save();

    // Cleanup old tokens
    await VerificationToken.cleanupExpired(user._id, TOKEN_TYPES.PASSWORD_RESET);

    logger.info('Password reset successful:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new APIError('Current and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new APIError('New password must be at least 8 characters', 400);
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new APIError('Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    logger.info('Password changed:', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth - Get authorization URL
 * GET /api/auth/google/url
 */
const getGoogleAuthUrl = async (req, res, next) => {
  try {
    const googleAuthService = require('../services/googleAuthService');
    const state = require('crypto').randomBytes(32).toString('hex');
    
    // Store state in session or cache for verification
    // For now, we'll just return the URL
    
    const authUrl = googleAuthService.getAuthorizationUrl(state);
    
    res.status(200).json({
      success: true,
      data: {
        authUrl,
        state
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth - Handle callback
 * POST /api/auth/google/callback
 */
const googleAuthCallback = async (req, res, next) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      throw new APIError('Authorization code is required', 400);
    }
    
    const googleAuthService = require('../services/googleAuthService');
    
    // Exchange code for tokens
    const tokens = await googleAuthService.exchangeCodeForTokens(code);
    
    // Get user info
    const googleUser = await googleAuthService.getUserInfo(tokens.accessToken);
    
    // Find or create user
    let user = await User.findOne({ email: googleUser.email });
    
    if (!user) {
      // Create new user
      user = await User.create({
        firstName: googleUser.name.split(' ')[0] || 'Google',
        lastName: googleUser.name.split(' ').slice(1).join(' ') || 'User',
        email: googleUser.email,
        password: require('crypto').randomBytes(32).toString('hex'), // Random password
        isVerified: googleUser.verifiedEmail,
        googleId: googleUser.id,
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
        googleTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000)
      });
    } else {
      // Update existing user with Google tokens
      user.googleId = googleUser.id;
      user.googleAccessToken = tokens.accessToken;
      user.googleRefreshToken = tokens.refreshToken;
      user.googleTokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
      user.isVerified = user.isVerified || googleUser.verifiedEmail;
      await user.save();
    }
    
    // Generate JWT tokens
    const jwtTokens = generateTokens(user._id);
    
    // Update refresh token
    user.refreshToken = jwtTokens.refreshToken;
    await user.save();
    
    logger.info('Google OAuth successful:', { userId: user._id, email: user.email });
    
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        token: jwtTokens.token,
        refreshToken: jwtTokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnect Google account
 * POST /api/auth/google/disconnect
 */
const disconnectGoogle = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Revoke Google token if possible
    if (user.googleAccessToken) {
      try {
        const googleAuthService = require('../services/googleAuthService');
        await googleAuthService.revokeAccessToken(user.googleAccessToken);
      } catch (revokeError) {
        logger.warn('Failed to revoke Google token:', revokeError.message);
      }
    }
    
    // Clear Google data
    user.googleId = null;
    user.googleAccessToken = null;
    user.googleRefreshToken = null;
    user.googleTokenExpiry = null;
    await user.save();
    
    logger.info('Google account disconnected:', { userId: user._id });
    
    res.status(200).json({
      success: true,
      message: 'Google account disconnected successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Google access token
 * POST /api/auth/google/refresh
 */
const refreshGoogleToken = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user.googleRefreshToken) {
      throw new APIError('No Google refresh token available', 400);
    }
    
    const googleAuthService = require('../services/googleAuthService');
    const tokens = await googleAuthService.refreshAccessToken(user.googleRefreshToken);
    
    // Update user tokens
    user.googleAccessToken = tokens.accessToken;
    user.googleTokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Google token refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
