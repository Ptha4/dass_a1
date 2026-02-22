const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: true
    },
    type: {
        type: String,
        enum: ['NEW_MESSAGE', 'REPLY', 'ANNOUNCEMENT', 'MESSAGE_PINNED'],
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    messagePreview: {
        type: String,
        maxlength: 100
    },
    parentMessageId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for optimal performance
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, eventId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Static method to create notifications
NotificationSchema.statics.createNotification = async function(data) {
    const {
        userId,
        eventId,
        messageId,
        type,
        senderId,
        senderName,
        messagePreview,
        parentMessageId
    } = data;

    const notification = new this({
        userId,
        eventId,
        messageId,
        type,
        senderId,
        senderName,
        messagePreview,
        parentMessageId
    });

    return await notification.save();
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(userId) {
    return await this.countDocuments({ userId, isRead: false });
};

// Static method to mark notifications as read
NotificationSchema.statics.markAsRead = async function(userId, notificationIds = null) {
    const query = { userId, isRead: false };
    if (notificationIds && notificationIds.length > 0) {
        query._id = { $in: notificationIds };
    }
    
    return await this.updateMany(query, { isRead: true });
};

// Static method to get recent notifications
NotificationSchema.statics.getRecentNotifications = async function(userId, limit = 10) {
    return await this.find({ userId })
        .populate('eventId', 'eventName')
        .populate('messageId', 'content')
        .populate('senderId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model('Notification', NotificationSchema);
