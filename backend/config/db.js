const mongoose = require('mongoose');
const config = require('./env');

// Demo mode - uses in-memory storage when MongoDB is not available
let demoStorage = {};
let isDemoMode = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.log('Switching to DEMO MODE (in-memory storage)');
    isDemoMode = true;
    demoStorage = {
      users: [],
      alerts: [],
      scanHistory: [],
      activityLogs: [],
      fraudReports: []
    };
    return { isDemo: true };
  }
};

// Demo mode helpers for when MongoDB is not available
const getDemoStorage = () => demoStorage;
const isInDemoMode = () => isDemoMode;

module.exports = connectDB;
module.exports.getDemoStorage = getDemoStorage;
module.exports.isInDemoMode = isInDemoMode;
