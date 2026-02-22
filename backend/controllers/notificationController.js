const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    // Build query
    const query = { userId };
    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
        .populate('eventId', 'eventName')
        .populate('messageId', 'content')
        .populate('senderId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
        notifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        },
        unreadCount
    });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({ count: unreadCount });
});

// @desc    Mark notifications as read
// @route   PATCH /api/notifications/mark-read
// @access  Private
const markNotificationsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    await Notification.markAsRead(userId, notificationIds);

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({ 
        message: 'Notifications marked as read',
        unreadCount 
    });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    await Notification.markAsRead(userId);

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({ 
        message: 'All notifications marked as read',
        unreadCount 
    });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:notificationId
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    // Check if notification belongs to user
    if (notification.userId.toString() !== userId) {
        res.status(403);
        throw new Error('Access denied');
    }

    await Notification.findByIdAndDelete(notificationId);

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({ 
        message: 'Notification deleted',
        unreadCount 
    });
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
const clearAllNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    await Notification.deleteMany({ userId });

    res.json({ 
        message: 'All notifications cleared',
        unreadCount: 0
    });
});

// @desc    Get notifications by event
// @route   GET /api/notifications/event/:eventId
// @access  Private
const getEventNotifications = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId, eventId })
        .populate('eventId', 'eventName')
        .populate('messageId', 'content')
        .populate('senderId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Notification.countDocuments({ userId, eventId });

    res.json({
        notifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get notification settings
// @route   GET /api/notifications/settings
// @access  Private
const getNotificationSettings = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId).select('notificationSettings');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Default notification settings if not set
    const defaultSettings = {
        newMessages: true,
        replies: true,
        announcements: true,
        pinnedMessages: true,
        emailNotifications: false
    };

    res.json({
        settings: user.notificationSettings || defaultSettings
    });
});

// @desc    Update notification settings
// @route   PATCH /api/notifications/settings
// @access  Private
const updateNotificationSettings = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settings = req.body;

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Validate settings
    const validSettings = {
        newMessages: Boolean,
        replies: Boolean,
        announcements: Boolean,
        pinnedMessages: Boolean,
        emailNotifications: Boolean
    };

    const updatedSettings = {};
    for (const [key, type] of Object.entries(validSettings)) {
        if (settings.hasOwnProperty(key)) {
            if (typeof settings[key] !== type.name.toLowerCase()) {
                res.status(400);
                throw new Error(`Invalid value for ${key}`);
            }
            updatedSettings[key] = settings[key];
        }
    }

    user.notificationSettings = { ...user.notificationSettings, ...updatedSettings };
    await user.save();

    res.json({
        message: 'Notification settings updated',
        settings: user.notificationSettings
    });
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
const getNotificationStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        recentNotifications
    ] = await Promise.all([
        Notification.countDocuments({ userId }),
        Notification.getUnreadCount(userId),
        Notification.aggregate([
            { $match: { userId } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        Notification.find({ userId })
            .populate('eventId', 'eventName')
            .sort({ createdAt: -1 })
            .limit(5)
    ]);

    res.json({
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        recentNotifications
    });
});

module.exports = {
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
};
