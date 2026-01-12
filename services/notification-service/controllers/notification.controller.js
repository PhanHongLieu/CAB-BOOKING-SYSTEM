const Notification = require('../models/Notification.model');
const { NotFoundError } = require('../../shared/errors');
const logger = require('../../shared/logger');
const { sendNotification } = require('../socket/socket.handler');

// Get io instance (will be set by server.js)
let ioInstance = null;
exports.setIo = (io) => {
  ioInstance = io;
};

exports.sendNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message, data } = req.body;

    if (!ioInstance) {
      throw new Error('Socket.io instance not initialized');
    }

    const notification = await sendNotification(ioInstance, userId, {
      type,
      title,
      message,
      data
    });

    logger.info(`Notification sent to user ${userId}`);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

exports.broadcastNotification = async (req, res, next) => {
  try {
    const { userIds, type, title, message, data } = req.body;

    if (!ioInstance) {
      throw new Error('Socket.io instance not initialized');
    }

    const notifications = [];
    for (const userId of userIds) {
      const notification = await sendNotification(ioInstance, userId, {
        type,
        title,
        message,
        data
      });
      notifications.push(notification);
    }

    res.status(201).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification');
    }

    if (notification.userId.toString() !== userId) {
      throw new NotFoundError('Notification');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};
