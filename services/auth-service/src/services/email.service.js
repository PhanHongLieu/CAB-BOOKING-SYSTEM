/**
 * Email Service
 * =============
 * 
 * Handles email sending for verification, password reset, and notifications.
 * Uses nodemailer for SMTP transport.
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger.util');

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const defaultFrom = process.env.EMAIL_FROM || 'noreply@cabsystem.com';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create transporter
let transporter = null;

/**
 * Initialize email transporter
 */
const initializeTransporter = () => {
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    logger.warn('Email service not configured - emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);

  // Verify connection
  transporter.verify((error) => {
    if (error) {
      logger.error('Email transporter verification failed:', error.message);
    } else {
      logger.info('Email transporter ready');
    }
  });

  return transporter;
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<Object>}
 */
const sendEmail = async (options) => {
  const { to, subject, html, text } = options;

  // If transporter not configured, log the email
  if (!transporter) {
    logger.info('📧 Email (not sent - no SMTP configured):', {
      to,
      subject,
      preview: text ? text.substring(0, 100) : 'HTML only',
    });

    // Extract link for easier testing
    if (html) {
      const linkMatch = html.match(/href="(https?:\/\/.*?)"/);
      if (linkMatch && linkMatch[1]) {
        logger.info(`🔗 [DEV] CLICK TO VERIFY: ${linkMatch[1]}`);
      }
    }

    return { messageId: 'mock-' + Date.now(), mock: true };
  }

  try {
    const mailOptions = {
      from: options.from || defaultFrom,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Send email verification email
 * @param {Object} user - User object
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚕 Cab Booking System</h1>
          <p>Email Verification</p>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName}!</h2>
          <p>Thank you for registering with Cab Booking System. Please verify your email address by clicking the button below:</p>
          <center>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cab Booking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${user.firstName}!
    
    Thank you for registering with Cab Booking System.
    
    Please verify your email address by visiting this link:
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create an account, please ignore this email.
  `;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - Cab Booking System',
    html,
    text,
  });
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
          <p>Cab Booking System</p>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName}!</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <center>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cab Booking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${user.firstName}!
    
    We received a request to reset your password.
    
    Please visit this link to create a new password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this reset, please ignore this email.
    Never share this link with anyone.
  `;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request - Cab Booking System',
    html,
    text,
  });
};

/**
 * Send password changed notification
 * @param {Object} user - User object
 */
const sendPasswordChangedNotification = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Changed</h1>
          <p>Cab Booking System</p>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName}!</h2>
          <div class="alert">
            <strong>Your password has been successfully changed.</strong>
          </div>
          <p>This change was made on ${new Date().toLocaleString()}.</p>
          <div class="warning">
            <strong>⚠️ Didn't make this change?</strong>
            <p>If you didn't change your password, your account may have been compromised. Please take the following steps immediately:</p>
            <ol>
              <li>Reset your password using the "Forgot Password" feature</li>
              <li>Contact our support team</li>
              <li>Review your recent account activity</li>
            </ol>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cab Booking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${user.firstName}!
    
    Your password has been successfully changed on ${new Date().toLocaleString()}.
    
    If you didn't make this change, your account may have been compromised.
    Please reset your password immediately and contact our support team.
  `;

  await sendEmail({
    to: user.email,
    subject: 'Password Changed - Cab Booking System',
    html,
    text,
  });
};

/**
 * Send account locked notification
 * @param {Object} user - User object
 * @param {Date} unlockTime - When account will be unlocked
 */
const sendAccountLockedNotification = async (user, unlockTime) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Account Locked</h1>
          <p>Cab Booking System</p>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName}!</h2>
          <div class="alert">
            <strong>Your account has been temporarily locked due to multiple failed login attempts.</strong>
          </div>
          <p>Your account will be automatically unlocked at:</p>
          <p style="font-size: 18px; font-weight: bold; color: #dc3545;">${unlockTime.toLocaleString()}</p>
          <p>If this wasn't you, someone may be trying to access your account. We recommend:</p>
          <ul>
            <li>Waiting for the lockout period to end</li>
            <li>Using the "Forgot Password" feature to reset your password</li>
            <li>Enabling two-factor authentication for extra security</li>
          </ul>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cab Booking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${user.firstName}!
    
    Your account has been temporarily locked due to multiple failed login attempts.
    
    Your account will be automatically unlocked at: ${unlockTime.toLocaleString()}
    
    If this wasn't you, someone may be trying to access your account.
    We recommend resetting your password and enabling two-factor authentication.
  `;

  await sendEmail({
    to: user.email,
    subject: '⚠️ Account Locked - Cab Booking System',
    html,
    text,
  });
};

/**
 * Send welcome email after email verification
 * @param {Object} user - User object
 */
const sendWelcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .features { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
        .feature { flex: 1; min-width: 200px; background: white; padding: 20px; border-radius: 10px; text-align: center; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Cab Booking System!</h1>
          <p>Your account is now verified</p>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName}!</h2>
          <p>Thank you for verifying your email. You're all set to start using our service!</p>
          <center>
            <a href="${frontendUrl}/dashboard" class="button">Go to Dashboard</a>
          </center>
          <h3>What you can do now:</h3>
          <div class="features">
            <div class="feature">
              <h4>🚗 Book Rides</h4>
              <p>Request rides anytime, anywhere</p>
            </div>
            <div class="feature">
              <h4>📍 Track Live</h4>
              <p>Real-time driver tracking</p>
            </div>
            <div class="feature">
              <h4>💳 Easy Payments</h4>
              <p>Multiple payment options</p>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cab Booking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to Cab Booking System, ${user.firstName}!
    
    Your email has been verified and your account is now active.
    
    You can now:
    - Book rides anytime, anywhere
    - Track your driver in real-time
    - Pay with multiple payment options
    
    Visit ${frontendUrl}/dashboard to get started!
  `;

  await sendEmail({
    to: user.email,
    subject: '🎉 Welcome to Cab Booking System!',
    html,
    text,
  });
};

// Initialize transporter on module load
initializeTransporter();

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedNotification,
  sendAccountLockedNotification,
  sendWelcomeEmail,
  initializeTransporter,
};
