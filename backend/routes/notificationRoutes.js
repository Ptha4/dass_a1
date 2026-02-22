const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getNotifications,
    getUnreadCount,
    markNotificationsRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    getEventNotifications,
    getNotificationSettings,
    updateNotificationSettings,
    getNotificationStats
} = require('../controllers/notificationController');

// Notification CRUD operations
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.get('/event/:eventId', protect, getEventNotifications);
router.get('/stats', protect, getNotificationStats);

// Mark as read operations
router.patch('/mark-read', protect, markNotificationsRead);
router.patch('/mark-all-read', protect, markAllNotificationsRead);

// Delete operations
router.delete('/:notificationId', protect, deleteNotification);
router.delete('/clear-all', protect, clearAllNotifications);

// Settings
router.get('/settings', protect, getNotificationSettings);
router.patch('/settings', protect, updateNotificationSettings);

module.exports = router;
