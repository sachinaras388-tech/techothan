/**
 * Verification Token Model
 * Handles OTP and email verification tokens
 */

const mongoose = require('mongoose');

// Token types enum
const TOKEN_TYPES = {
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  PHONE_VERIFICATION: 'phone_verification',
};

// Verification token schema
const verificationTokenSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    
    // Token details
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(TOKEN_TYPES),
      required: [true, 'Token type is required'],
    },
    
    // Expiry
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    
    // Status
    isUsed: {
      type: Boolean,
      default: false,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    
    // Metadata
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for query performance
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationTokenSchema.index({ userId: 1, type: 1 });

// Check if token is valid
verificationTokenSchema.methods.isValid = function () {
  return !this.isUsed && !this.isRevoked && this.expiresAt > Date.now();
};

// Static method to find valid token
verificationTokenSchema.statics.findValidToken = async function (userId, token, type) {
  return this.findOne({
    userId,
    token,
    type,
    isUsed: false,
    isRevoked: false,
    expiresAt: { $gt: Date.now() },
  });
};

// Static method to cleanup expired tokens
verificationTokenSchema.statics.cleanupExpired = async function (userId, type) {
  return this.deleteMany({
    userId,
    type,
    $or: [
      { isUsed: true },
      { isRevoked: true },
      { expiresAt: { $lt: Date.now() } },
    ],
  });
};

// Generate random token
verificationTokenSchema.statics.generateToken = function () {
  const digits = '0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return token;
};

// Generate OTP (alias for generateToken - generates 6-digit numeric OTP)
verificationTokenSchema.statics.generateOTP = function () {
  return this.generateToken();
};

// Verification Token model
const VerificationToken = mongoose.model(
  'VerificationToken',
  verificationTokenSchema
);

// Export model and types
module.exports = { VerificationToken, TOKEN_TYPES };
