const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes (called by other services)
router.post('/send', notificationController.sendNotification);
router.post('/broadcast', notificationController.broadcastNotification);

// Protected routes (called by users)
router.use(authenticate);
router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;
