/**
 * Fraud Report Model
 * Stores user-submitted fraud reports
 */

const mongoose = require('mongoose');

// Report types
const REPORT_TYPES = {
  PHISHING: 'phishing',
  SCAM: 'scam',
  FAKE_PAYMENT: 'fake_payment',
  IMPERSONATION: 'impersonation',
  IDENTITY_THEFT: 'identity_theft',
  MALWARE: 'malware',
  CYBERBULLYING: 'cyberbullying',
  ABUSE: 'abuse',
  OTHER: 'other',
};

// Report status
const REPORT_STATUS = {
  PENDING: 'pending',
  INVESTIGATING: 'investigating',
  VERIFIED: 'verified',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
};

// Report severity
const REPORT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Fraud report schema
const fraudReportSchema = new mongoose.Schema(
  {
    // Reporter
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true,
    },
    
    // Report details
    type: {
      type: String,
      enum: Object.values(REPORT_TYPES),
      required: [true, 'Report type is required'],
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    
    // Evidence
    evidence: {
      screenshots: [String],
      links: [String],
      messages: [String],
      phoneNumbers: [String],
      emailAddresses: [String],
      socialMediaHandles: [String],
    },
    
    // Suspect information
    suspect: {
      name: String,
      phone: String,
      email: String,
      website: String,
      socialMediaHandle: String,
      accountNumber: String,
      upiId: String,
      ipAddress: String,
    },
    
    // Financial impact
    financialImpact: {
      amount: Number,
      currency: {
        type: String,
        default: 'INR',
      },
      transactionId: String,
      description: String,
    },
    
    // Status and resolution
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
    },
    severity: {
      type: String,
      enum: Object.values(REPORT_SEVERITY),
      default: REPORT_SEVERITY.MEDIUM,
    },
    
    // Assigned admin
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Investigation notes
    investigation: {
      notes: String,
      evidenceCollected: [String],
      actionTaken: String,
    },
    
    // Resolution
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: {
      type: String,
    },
    
    // Location data
    location: {
      city: String,
      state: String,
      country: String,
      latitude: Number,
      longitude: Number,
      ipAddress: String,
    },
    
    // Timestamps for various stages
   acknowledgedAt: {
      type: Date,
    },
    investigatedAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
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
fraudReportSchema.index({ reporterId: 1, createdAt: -1 });
fraudReportSchema.index({ status: 1, createdAt: -1 });
fraudReportSchema.index({ type: 1, status: 1 });
fraudReportSchema.index({ assignedTo: 1, status: 1 });
fraudReportSchema.index({ createdAt: -1 });

// Static method to get report statistics
fraudReportSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalReports: { $sum: 1 },
        pendingReports: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        investigatingReports: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
verifiedReports: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
        resolvedReports: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        totalFinancialImpact: { $sum: '$financialImpact.amount' },
      },
    },
  ]);
  
  return stats[0] || {
    totalReports: 0,
    pendingReports: 0,
    investigatingReports: 0,
    verifiedReports: 0,
    resolvedReports: 0,
    totalFinancialImpact: 0,
  };
};

// Static method to get reports by type
fraudReportSchema.statics.getStatsByType = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Fraud Report model
const FraudReport = mongoose.model('FraudReport', fraudReportSchema);

// Export model and types
module.exports = { FraudReport, REPORT_TYPES, REPORT_STATUS, REPORT_SEVERITY };
