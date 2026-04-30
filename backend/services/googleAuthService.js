/**
 * Google OAuth Service
 * Handles Google OAuth 2.0 authentication for Gmail access
 */

const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

// Google OAuth configuration
const GOOGLE_OAUTH_CONFIG = {
  clientId: config.googleClientId,
  clientSecret: config.googleClientSecret,
  redirectUri: config.googleRedirectUri,
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ')
};

/**
 * Generate Google OAuth authorization URL
 */
const getAuthorizationUrl = (state) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_CONFIG.scope,
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
const exchangeCodeForTokens = async (code) => {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
      scope: response.data.scope
    };
  } catch (error) {
    logger.error('Error exchanging code for tokens:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    };
  } catch (error) {
    logger.error('Error refreshing access token:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Get user info from Google
 */
const getUserInfo = async (accessToken) => {
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return {
      id: response.data.id,
      email: response.data.email,
      name: response.data.name,
      picture: response.data.picture,
      verifiedEmail: response.data.verified_email
    };
  } catch (error) {
    logger.error('Error getting user info:', error.response?.data || error.message);
    throw new Error('Failed to get user info from Google');
  }
};

/**
 * Revoke access token
 */
const revokeAccessToken = async (accessToken) => {
  try {
    await axios.post(`https://oauth2.googleapis.com/revoke`, {
      token: accessToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return true;
  } catch (error) {
    logger.error('Error revoking token:', error.response?.data || error.message);
    return false;
  }
};

/**
 * Validate access token
 */
const validateAccessToken = async (accessToken) => {
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/tokeninfo', {
      params: {
        access_token: accessToken
      }
    });

    return {
      valid: true,
      userId: response.data.user_id,
      email: response.data.email,
      scope: response.data.scope,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    return { valid: false };
  }
};

module.exports = {
  GOOGLE_OAUTH_CONFIG,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserInfo,
  revokeAccessToken,
  validateAccessToken
};
