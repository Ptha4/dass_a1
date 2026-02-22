const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// Middleware to verify user has access to event forum
exports.verifyForumAccess = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if user is organizer of the event
    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId.toString() === userId) {
        req.userRole = 'organizer';
        req.eventOrganizerId = event.organizerId;
        return next();
    }

    // Check if user is registered for the event
    const registration = await Registration.findOne({
        user: userId,
        event: eventId,
        status: { $in: ['confirmed', 'payment_approved'] }
    });

    if (!registration) {
        return res.status(403).json({ 
            message: 'Access denied: You must be registered for this event to participate in the forum' 
        });
    }

    req.userRole = 'participant';
    req.eventOrganizerId = event.organizerId;
    next();
});

// Middleware to verify user is organizer (for organizer-only actions)
exports.verifyOrganizerAccess = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId.toString() !== userId) {
        return res.status(403).json({ 
            message: 'Access denied: Only organizers can perform this action' 
        });
    }

    req.userRole = 'organizer';
    req.eventOrganizerId = event.organizerId;
    next();
});

// Middleware to verify user can delete a message
exports.verifyDeleteAccess = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole;

    const Message = require('../models/Message');
    const message = await Message.findById(messageId).populate('eventId', 'organizerId');

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user can delete this message
    const canDelete = message.canDelete(userId, userRole, message.eventId.organizerId);
    if (!canDelete) {
        return res.status(403).json({ 
            message: 'Access denied: You can only delete your own messages or you must be an organizer' 
        });
    }

    next();
});

// Middleware to verify user can pin/unpin messages
exports.verifyPinAccess = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user.id;

    const Message = require('../models/Message');
    const message = await Message.findById(messageId).populate('eventId', 'organizerId');

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user can pin this message
    const canPin = message.canPin(userId, message.eventId.organizerId);
    if (!canPin) {
        return res.status(403).json({ 
            message: 'Access denied: Only organizers can pin/unpin messages' 
        });
    }

    next();
});

// Middleware to verify user can mark announcements
exports.verifyAnnouncementAccess = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user.id;

    const Message = require('../models/Message');
    const message = await Message.findById(messageId).populate('eventId', 'organizerId');

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user can mark this message as announcement
    const canAnnounce = message.canAnnounce(userId, message.eventId.organizerId);
    if (!canAnnounce) {
        return res.status(403).json({ 
            message: 'Access denied: Only organizers can mark messages as announcements' 
        });
    }

    next();
});
