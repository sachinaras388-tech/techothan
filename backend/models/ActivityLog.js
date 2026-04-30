/**
 * Activity Log Model
 * Stores system and user activity logs
 */

const mongoose = require('mongoose');

// Activity types
const ACTIVITY_TYPES = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  PASSWORD_CHANGE: 'password_change',
  EMAIL_VERIFY: 'email_verify',
  SCAN_INITIATED: 'scan_initiated',
  FRAUD_DETECTED: 'fraud_detected',
  REPORT_SUBMITTED: 'report_submitted',
  ALERT_SENT: 'alert_sent',
  SETTINGS_CHANGE: 'settings_change',
  ADMIN_ACTION: 'admin_action',
  SYSTEM_EVENT: 'system_event',
};

// Activity status
const ACTIVITY_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
};

// Activity log schema
const activityLogSchema = new mongoose.Schema(
  {
    // User reference (optional for system events)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Activity details
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: [true, 'Activity type is required'],
    },
    description: {
      type: String,
      maxlength: [500],
    },
    status: {
      type: String,
      enum: Object.values(ACTIVITY_STATUS),
      default: ACTIVITY_STATUS.SUCCESS,
    },
    
    // Request/Response data
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    endpoint: {
      type: String,
    },
    method: {
      type: String,
    },
    requestData: {
      type: mongoose.Schema.Types.Mixed,
    },
    responseCode: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    
    // Metadata
    userRole: {
      type: String,
    },
    sessionId: {
      type: String,
    },
    location: {
      city: String,
      country: String,
      latitude: Number,
      longitude: Number,
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

// Indexes for query performance
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Static method to log activity
activityLogSchema.statics.log = async function (data) {
  return this.create(data);
};

// Static method to get user activity
activityLogSchema.statics.getUserActivity = async function (userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get system activity
activityLogSchema.statics.getSystemActivity = async function (startDate, endDate, limit = 100) {
  const match = { userId: { $exists: false } };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }
  
  return this.find(match)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Activity Log model
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Export model and types
module.exports = { ActivityLog, ACTIVITY_TYPES, ACTIVITY_STATUS };
