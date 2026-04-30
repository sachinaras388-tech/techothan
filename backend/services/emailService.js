/**
 * Email Service
 * Handles sending emails for verification, alerts, etc.
 */

const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: false,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
};

/**
 * Send verification email with 6-digit OTP
 */
const sendVerificationEmail = async (user, otp) => {
  try {
    const mailOptions = {
      from: config.emailFrom,
      to: user.email,
      subject: 'Your OTP Code - FraudShield',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e74c3c; }
            .content { margin: 20px 0; }
            .otp-box { background: #f8f9fa; border: 2px solid #e74c3c; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #e74c3c; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛡️ FraudShield</div>
            </div>
            <div class="content">
              <h2>Verify Your Email</h2>
              <p>Hello ${user.firstName},</p>
              <p>Thank you for registering with FraudShield. Please use the following OTP code to verify your email address:</p>
              <div class="otp-box">
                <p class="otp-code">${otp}</p>
              </div>
              <p>This code will expire in <strong>5 minutes</strong>.</p>
              <p><strong>Note:</strong> If you didn't create this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FraudShield. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your OTP code for FraudShield verification is: ${otp}. This code will expire in 5 minutes.`,
    };

    if (config.smtpUser) {
      await createTransporter().sendMail(mailOptions);
      logger.info('Verification OTP sent:', { email: user.email });
    }
  } catch (error) {
    logger.error('Failed to send verification email:', error);
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, token) => {
  try {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: config.emailFrom,
      to: user.email,
      subject: 'Reset Your Password - FraudShield',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e74c3c; }
            .content { margin: 20px 0; }
            .button { display: inline-block; padding: 15px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛡️ FraudShield</div>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>Hello ${user.firstName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link in your browser:</p>
              <p>${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
            </div>
            <div class="footer">
              <p>If you didn't request this, please ignore this email or contact support.</p>
              <p>© ${new Date().getFullYear()} FraudShield. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    if (config.smtpUser) {
      await createTransporter().sendMail(mailOptions);
      logger.info('Password reset email sent:', { email: user.email });
    }
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
  }
};

/**
 * Send fraud alert email
 */
const sendFraudAlertEmail = async (user, alert) => {
  try {
    const mailOptions = {
      from: config.emailFrom,
      to: user.email,
      subject: `⚠️ Fraud Alert: ${alert.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e74c3c; }
            .alert-box { background: #ffe6e6; border-left: 5px solid #e74c3c; padding: 20px; margin: 20px 0; }
            .severity { display: inline-block; padding: 5px 10px; background: #e74c3c; color: white; border-radius: 3px; font-size: 12px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛡️ FraudShield</div>
            </div>
            <div class="alert-box">
              <span class="severity">${alert.severity.toUpperCase()} ALERT</span>
              <h3>${alert.title}</h3>
              <p>${alert.message}</p>
              ${alert.recommendations?.length ? '<h4>Recommendations:</h4><ul>' + alert.recommendations.map(r => `<li>${r}</li>`).join('') + '</ul>' : ''}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FraudShield. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    if (config.smtpUser) {
      await createTransporter().sendMail(mailOptions);
      logger.info('Fraud alert email sent:', { email: user.email, alertId: alert._id });
    }
  } catch (error) {
    logger.error('Failed to send fraud alert email:', error);
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (user) => {
  try {
    const mailOptions = {
      from: config.emailFrom,
      to: user.email,
      subject: 'Welcome to FraudShield - Start Protecting Yourself',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e74c3c; }
            .content { margin: 20px 0; }
            .features { list-style: none; padding: 0; }
            .features li { padding: 10px 0; border-bottom: 1px solid #eee; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛡️ FraudShield</div>
            </div>
            <div class="content">
              <h2>Welcome, ${user.firstName}!</h2>
              <p>Thank you for joining FraudShield. You're now protected from cyber fraud.</p>
              <h3>What you can do:</h3>
              <ul class="features">
                <li>🔍 <strong>Scan URLs</strong> - Check if a link is safe before clicking</li>
                <li>📝 <strong>Analyze Messages</strong> - Detect scam and phishing texts</li>
                <li>📱 <strong>Verify UPI Payments</strong> - Check if a payment request is legitimate</li>
                <li>🔔 <strong>Get Real-Time Alerts</strong> - Instant notifications about threats</li>
                <li>📊 <strong>Dashboard</strong> - View your security statistics</li>
              </ul>
              <p>Start scanning now to protect yourself!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FraudShield. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    if (config.smtpUser) {
      await createTransporter().sendMail(mailOptions);
      logger.info('Welcome email sent:', { email: user.email });
    }
  } catch (error) {
    logger.error('Failed to send welcome email:', error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendFraudAlertEmail,
  sendWelcomeEmail,
};
