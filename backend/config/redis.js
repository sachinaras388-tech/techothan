const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  logger.info('Redis has been disabled for this project');
  return null;
};

const redisHelpers = {
  async storeOTP(key, otp, expirySeconds = 300) {
    logger.warn('Redis OTP storage is disabled');
    return false;
  },

  async verifyOTP(key, otp) {
    logger.warn('Redis OTP verification is disabled');
    return false;
  },

  async deleteOTP(key) {
    logger.warn('Redis OTP deletion is disabled');
    return false;
  },

  async storeRefreshToken(userId, token, expirySeconds = 604800) {
    logger.warn('Redis token storage is disabled');
    return false;
  },

  async getCache(key) {
    logger.warn('Redis cache is disabled');
    return null;
  },

  async setCache(key, data, expirySeconds = 3600) {
    logger.warn('Redis cache is disabled');
    return false;
  },

  async deleteCache(key) {
    logger.warn('Redis cache deletion is disabled');
    return false;
  },
};

// Export module with backward compatibility
module.exports = { connectRedis, redisClient, ...redisHelpers };
