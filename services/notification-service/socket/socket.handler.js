const logger = require('../../shared/logger');
const Notification = require('../models/Notification.model');

// Store user socket connections: userId -> socketId
const userSockets = new Map();

module.exports = (io, socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // User joins their personal room
  socket.on('join', async (userId) => {
    try {
      socket.join(`user:${userId}`);
      userSockets.set(userId, socket.id);
      logger.info(`User ${userId} joined notification room`);
    } catch (error) {
      logger.error('Error joining room:', error);
    }
  });

  // Send notification to user
  socket.on('send_notification', async (data) => {
    try {
      const { userId, notification } = data;
      
      // Save to database
      const savedNotification = await Notification.create({
        userId,
        ...notification
      });

      // Emit to user's room
      io.to(`user:${userId}`).emit('notification', savedNotification);
      
      logger.info(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  });

  // Mark notification as read
  socket.on('mark_read', async (notificationId) => {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date()
      });
      socket.emit('notification_read', { notificationId });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Remove from userSockets map
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        logger.info(`User ${userId} disconnected`);
        break;
      }
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  });
};

// Helper function to send notification (can be called from HTTP routes)
module.exports.sendNotification = async (io, userId, notification) => {
  try {
    // Save to database
    const savedNotification = await Notification.create({
      userId,
      ...notification
    });

    // Emit to user's room
    io.to(`user:${userId}`).emit('notification', savedNotification);
    
    return savedNotification;
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
};
