const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Notification = require('../models/Notification');

async function verifyEventAccess(userId, eventId) {
    const event = await Event.findById(eventId);
    if (!event) return false;
    if (event.organizerId && event.organizerId.toString() === userId) return true;
    const registration = await Registration.findOne({
        user: userId,
        event: eventId,
        status: { $in: ['confirmed', 'payment_approved'] }
    });
    return !!registration;
}

// @desc    Get all messages for an event
// @route   GET /api/forum/messages/:eventId
// @access  Private (requires forum access)
const getEventMessages = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { page = 1, limit = 50, parentMessageId } = req.query;
    const userId = req.user.id;
    const userRole = req.userRole;

    // Build query
    const query = { 
        eventId, 
        isDeleted: false 
    };

    if (parentMessageId) {
        query.parentMessageId = parentMessageId;
    } else {
        // Get top-level messages only (no parent)
        query.parentMessageId = null;
    }

    const skip = (page - 1) * limit;

    // Get messages with populated data
    const messages = await Message.find(query)
        .populate('senderId', 'firstName lastName')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Message.countDocuments(query);

    // Get event details
    const event = await Event.findById(eventId).select('eventName organizerId');
    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    res.json({
        messages,
        event: {
            id: event._id,
            name: event.eventName,
            organizerId: event.organizerId,
            isUserOrganizer: userRole === 'organizer'
        },
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get message thread (replies)
// @route   GET /api/forum/thread/:messageId
// @access  Private
const getMessageThread = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the parent message
    const parentMessage = await Message.findById(messageId)
        .populate('senderId', 'firstName lastName')
        .populate('reactions.userId', 'firstName lastName');

    if (!parentMessage || parentMessage.isDeleted) {
        res.status(404);
        throw new Error('Message not found');
    }

    // Verify user has access to the event
    const hasAccess = await verifyEventAccess(userId, parentMessage.eventId);
    if (!hasAccess) {
        res.status(403);
        throw new Error('Access denied');
    }

    // Get all replies
    const replies = await Message.find({
        parentMessageId: messageId,
        isDeleted: false
    })
    .populate('senderId', 'firstName lastName')
    .populate('reactions.userId', 'firstName lastName')
    .sort({ createdAt: 1 });

    res.json({
        parentMessage,
        replies
    });
});

// @desc    Create a new message
// @route   POST /api/forum/messages
// @access  Private
const createMessage = asyncHandler(async (req, res) => {
    const { eventId, content, parentMessageId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!eventId || !content) {
        res.status(400);
        throw new Error('Event ID and content are required');
    }

    if (content.length < 1 || content.length > 2000) {
        res.status(400);
        throw new Error('Content must be between 1 and 2000 characters');
    }

    // Verify user has access to this event
    const hasAccess = await verifyEventAccess(userId, eventId);
    if (!hasAccess) {
        res.status(403);
        throw new Error('Access denied: You are not registered for this event');
    }

    // If replying, verify parent message exists and is not deleted
    if (parentMessageId) {
        const parentMessage = await Message.findById(parentMessageId);
        if (!parentMessage || parentMessage.isDeleted) {
            res.status(404);
            throw new Error('Parent message not found');
        }
        if (parentMessage.eventId.toString() !== eventId) {
            res.status(400);
            throw new Error('Parent message does not belong to this event');
        }
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Create message
    const message = new Message({
        eventId,
        senderId: userId,
        senderRole: user.isOrganiser ? 'organizer' : 'participant',
        content,
        parentMessageId: parentMessageId || null
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName');

    res.status(201).json(message);
});

// @desc    Edit a message
// @route   PUT /api/forum/messages/:messageId
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.length < 1 || content.length > 2000) {
        res.status(400);
        throw new Error('Content must be between 1 and 2000 characters');
    }

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
        res.status(404);
        throw new Error('Message not found');
    }

    // Check if user can edit (only their own messages)
    if (message.senderId.toString() !== userId) {
        res.status(403);
        throw new Error('You can only edit your own messages');
    }

    // Verify user has access to the event
    const hasAccess = await verifyEventAccess(userId, message.eventId);
    if (!hasAccess) {
        res.status(403);
        throw new Error('Access denied');
    }

    // Add to edit history
    message.editHistory.push({
        content: message.content
    });

    message.content = content;
    await message.save();
    await message.populate('senderId', 'firstName lastName');

    res.json(message);
});

// @desc    Delete a message
// @route   DELETE /api/forum/messages/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId).populate('eventId');
    if (!message || message.isDeleted) {
        res.status(404);
        throw new Error('Message not found');
    }

    // Check if user can delete
    const user = await User.findById(userId);
    const canDelete = message.canDelete(userId, user.isOrganiser ? 'organizer' : 'participant', message.eventId.organizerId);
    if (!canDelete) {
        res.status(403);
        throw new Error('You cannot delete this message');
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedBy = userId;
    message.deletedAt = new Date();
    await message.save();

    res.json({ message: 'Message deleted successfully' });
});

// @desc    Pin/unpin a message
// @route   PATCH /api/forum/messages/:messageId/pin
// @access  Private/Organizer
const pinMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { isPinned } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId).populate('eventId');
    if (!message || message.isDeleted) {
        res.status(404);
        throw new Error('Message not found');
    }

    // Check if user is organizer of the event
    if (message.eventId.organizerId.toString() !== userId) {
        res.status(403);
        throw new Error('Only organizers can pin messages');
    }

    message.isPinned = isPinned;
    await message.save();
    await message.populate('senderId', 'firstName lastName');

    res.json(message);
});

// @desc    Mark/unmark message as announcement
// @route   PATCH /api/forum/messages/:messageId/announcement
// @access  Private/Organizer
const markAnnouncement = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { isAnnouncement } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId).populate('eventId');
    if (!message || message.isDeleted) {
        res.status(404);
        throw new Error('Message not found');
    }

    // Check if user is organizer of the event
    if (message.eventId.organizerId.toString() !== userId) {
        res.status(403);
        throw new Error('Only organizers can mark messages as announcements');
    }

    message.isAnnouncement = isAnnouncement;
    await message.save();
    await message.populate('senderId', 'firstName lastName');

    res.json(message);
});

// @desc    Add/remove reaction to message
// @desc    Get pinned messages for an event
// @route   GET /api/forum/messages/:eventId/pinned
// @access  Private
const getPinnedMessages = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this event
    const hasAccess = await verifyEventAccess(userId, eventId);
    if (!hasAccess) {
        res.status(403);
        throw new Error('Access denied: You are not registered for this event');
    }

    const messages = await Message.find({
        eventId,
        isPinned: true,
        isDeleted: false
    })
    .populate('senderId', 'firstName lastName')
    .populate('reactions.userId', 'firstName lastName')
    .sort({ isPinned: -1, createdAt: -1 });

    res.json(messages);
});

// @desc    Get announcements for an event
// @route   GET /api/forum/messages/:eventId/announcements
// @access  Private
const getAnnouncements = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this event
    const hasAccess = await verifyEventAccess(userId, eventId);
    if (!hasAccess) {
        res.status(403);
        throw new Error('Access denied: You are not registered for this event');
    }

    const messages = await Message.find({
        eventId,
        isAnnouncement: true,
        isDeleted: false
    })
    .populate('senderId', 'firstName lastName')
    .populate('reactions.userId', 'firstName lastName')
    .sort({ createdAt: -1 });

    res.json(messages);
});

// @desc    Search messages in an event
// @route   GET /api/forum/messages/:eventId/search
// @access  Private
const searchMessages = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
        res.status(400);
        throw new Error('Search query must be at least 2 characters');
    }

    // Verify user has access to this event
    const hasAccess = await verifyEventAccess(userId, eventId);
    if (!hasAccess) {
        res.status(403);
        throw new Error('Access denied: You are not registered for this event');
    }

    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(q.trim(), 'i');

    const messages = await Message.find({
        eventId,
        content: searchRegex,
        isDeleted: false
    })
    .populate('senderId', 'firstName lastName')
    .populate('reactions.userId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Message.countDocuments({
        eventId,
        content: searchRegex,
        isDeleted: false
    });

    res.json({
        messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Add or remove reaction to a message
// @route   POST /api/forum/messages/:messageId/reaction
// @access  Private
const addReaction = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    // Validate emoji (basic validation - you might want to use a library for this)
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
        res.status(400);
        throw new Error('Invalid emoji');
    }

    // Find the message
    const message = await Message.findById(messageId).populate('eventId', 'organizerId');
    if (!message) {
        res.status(404);
        throw new Error('Message not found');
    }

    // Toggle reaction
    const result = message.toggleReaction(emoji, userId);
    await message.save();

    // Get user details for notification
    const user = await User.findById(userId).select('firstName lastName');
    
    // Create notification for message author (if not self-reaction)
    if (message.senderId.toString() !== userId) {
        await Notification.createNotification({
            userId: message.senderId,
            eventId: message.eventId._id,
            messageId: message._id,
            type: 'REACTION',
            senderId: userId,
            senderName: `${user.firstName} ${user.lastName}`,
            messagePreview: message.content.substring(0, 100),
            parentMessageId: message.parentMessageId
        });
    }

    res.json({
        success: true,
        action: result.action,
        emoji: result.emoji,
        reactions: Object.fromEntries(result.reactions)
    });
});

// @desc    Check if current user has forum access (organizer or registered)
// @route   GET /api/forum/access/:eventId
// @access  Private
const checkForumAccess = asyncHandler(async (req, res) => {
    res.json({ hasAccess: true });
});

module.exports = {
    getEventMessages,
    getMessageThread,
    createMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    markAnnouncement,
    getPinnedMessages,
    getAnnouncements,
    addReaction,
    searchMessages,
    checkForumAccess
};
