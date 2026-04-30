/**
 * Alert Model
 * Stores real-time fraud alerts and notifications
 */

const mongoose = require('mongoose');

// Alert severity levels
const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Alert status
const ALERT_STATUS = {
  NEW: 'new',
  READ: 'read',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
};

// Alert types
const ALERT_TYPES = {
  FRAUD_DETECTED: 'fraud_detected',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  SCAM_REPORT: 'scam_report',
  PHISHING_ATTEMPT: 'phishing_attempt',
  ACCOUNT_TAKEOVER: 'account_takeover',
  UNSAFE_LINK: 'unsafe_link',
  FAKE_PAYMENT: 'fake_payment',
  SPAM_MESSAGE: 'spam_message',
  THREAT_DETECTED: 'threat_detected',
  SECURITY_BREACH: 'security_breach',
};

// Alert channel
const ALERT_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
};

// Alert schema
const alertSchema = new mongoose.Schema(
  {
    // User who should receive the alert
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Alert details
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: Object.values(ALERT_TYPES),
      required: [true, 'Alert type is required'],
    },
    severity: {
      type: String,
      enum: Object.values(ALERT_SEVERITY),
      default: ALERT_SEVERITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(ALERT_STATUS),
      default: ALERT_STATUS.NEW,
    },
    
    // Reference to scan or report
    referenceType: {
      type: String,
      enum: ['scan', 'report', 'activity', null],
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceType',
      default: null,
    },
    
    // Action information
    actionTaken: {
      type: String,
      maxlength: [500],
    },
    recommendations: [String],
    
    // Delivery status
    deliveryStatus: {
      inApp: {
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
    },
    
    // Location data (for geo-based alerts)
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
      city: String,
      country: String,
    },
    
    // Acknowledgment
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Resolved
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ userId: 1, status: 1 });
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ type: 1 });

// Static method to get alert statistics
alertSchema.statics.getStats = async function (userId = null) {
  const match = userId ? { userId } : {};
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        newAlerts: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        readAlerts: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        criticalAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
      },
    },
  ]);
  
  return stats[0] || {
    totalAlerts: 0,
    newAlerts: 0,
    readAlerts: 0,
    criticalAlerts: 0,
    highAlerts: 0,
  };
};

// Static method to mark as read
alertSchema.statics.markAsRead = async function (alertIds, userId) {
  return this.updateMany(
    {
      _id: { $in: alertIds },
      userId,
      status: ALERT_STATUS.NEW,
    },
    {
      $set: { status: ALERT_STATUS.READ },
    }
  );
};

// Static method to get unread count
alertSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    userId,
    status: ALERT_STATUS.NEW,
  });
};

// Alert model
const Alert = mongoose.model('Alert', alertSchema);

// Export model and enums
module.exports = { Alert, ALERT_SEVERITY, ALERT_STATUS, ALERT_TYPES, ALERT_CHANNELS };
