/**
 * Scan History Model
 * Stores all fraud detection scan results
 */

const mongoose = require('mongoose');

// Scan types enum
const SCAN_TYPES = {
  TEXT: 'text',
  URL: 'url',
  PHONE: 'phone',
  UPI: 'upi',
  EMAIL: 'email',
  FILE: 'file',
};

// Scan result types
const SCAN_RESULTS = {
  SAFE: 'safe',
  SUSPICIOUS: 'suspicious',
  FRAUD: 'fraud',
  THREAT: 'threat',
};

// Scan history schema
const scanHistorySchema = new mongoose.Schema(
  {
    // User who initiated the scan
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Scan type and content
    type: {
      type: String,
      enum: Object.values(SCAN_TYPES),
      required: [true, 'Scan type is required'],
    },
    content: {
      type: String,
      required: [true, 'Content to scan is required'],
    },
    
    // Analysis result
    result: {
      type: String,
      enum: Object.values(SCAN_RESULTS),
      required: [true, 'Scan result is required'],
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    
    // Detailed analysis
    analysis: {
      detectedType: String,
      category: String,
      matchedPatterns: [String],
      details: mongoose.Schema.Types.Mixed,
    },
    
    // Threat information (if detected)
    threatInfo: {
      name: String,
      description: String,
      severity: String,
      recommendations: [String],
    },
    
    // Status
    isFlagged: {
      type: Boolean,
      default: false,
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    isFalsePositive: {
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

// Indexes for query performance
scanHistorySchema.index({ userId: 1, createdAt: -1 });
scanHistorySchema.index({ type: 1, result: 1 });
scanHistorySchema.index({ createdAt: -1 });
scanHistorySchema.index({ riskScore: -1 });
scanHistorySchema.index({ isFlagged: 1 });

// Static method to get scan statistics
scanHistorySchema.statics.getStats = async function (startDate, endDate) {
  const match = {};
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalScans: { $sum: 1 },
        safeScans: { $sum: { $cond: [{ $eq: ['$result', 'safe'] }, 1, 0] } },
        suspiciousScans: { $sum: { $cond: [{ $eq: ['$result', 'suspicious'] }, 1, 0] } },
        fraudScans: { $sum: { $cond: [{ $eq: ['$result', 'fraud'] }, 1, 0] } },
        threatScans: { $sum: { $cond: [{ $eq: ['$result', 'threat'] }, 1, 0] } },
        avgRiskScore: { $avg: '$riskScore' },
        avgConfidence: { $avg: '$confidence' },
      },
    },
  ]);
  
  return stats[0] || {
    totalScans: 0,
    safeScans: 0,
    suspiciousScans: 0,
    fraudScans: 0,
    threatScans: 0,
    avgRiskScore: 0,
    avgConfidence: 0,
  };
};

// Static method to get scans by type
scanHistorySchema.statics.getStatsByType = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        fraudCount: { $sum: { $cond: [{ $eq: ['$result', 'fraud'] }, 1, 0] } },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Static method to get recent scans
scanHistorySchema.statics.getRecentScans = async function (limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .lean();
};

// Scan History model
const ScanHistory = mongoose.model('ScanHistory', scanHistorySchema);

// Export model and types
module.exports = { ScanHistory, SCAN_TYPES, SCAN_RESULTS };
