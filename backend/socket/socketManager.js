const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

class SocketManager {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map(); // userId -> socketId
        this.userSockets = new Map(); // socketId -> userId
        this.eventRooms = new Map(); // eventId -> Set of userIds
        
        this.setupMiddleware();
        this.setupEventHandlers();
    }

    setupMiddleware() {
        // Authentication middleware for Socket.IO
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                console.log('Socket auth token:', token ? 'Present' : 'Missing');
                
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log('JWT decoded:', decoded);
                console.log('User ID from token:', decoded.user?.id);
                
                const user = await User.findById(decoded.user?.id).select('-password');
                console.log('Database lookup result:', user);
                console.log('User ID type:', typeof decoded.user?.id);
                
                if (!user) {
                    console.log('User lookup failed for ID:', decoded.user?.id);
                    return next(new Error('User not found'));
                }

                socket.user = user;
                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.user.firstName} ${socket.user.lastName} (${socket.user.id})`);
            
            // Store user connection
            this.connectedUsers.set(socket.user.id, socket.id);
            this.userSockets.set(socket.id, socket.user.id);

            // Handle joining event rooms
            socket.on('join-event', async (eventId) => {
                try {
                    await this.handleJoinEvent(socket, eventId);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle leaving event rooms
            socket.on('leave-event', (eventId) => {
                this.handleLeaveEvent(socket, eventId);
            });

            // Handle sending messages
            socket.on('send-message', async (messageData) => {
                try {
                    await this.handleSendMessage(socket, messageData);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle message editing
            socket.on('edit-message', async (data) => {
                try {
                    await this.handleEditMessage(socket, data);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle message deletion
            socket.on('delete-message', async (data) => {
                try {
                    await this.handleDeleteMessage(socket, data);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle reactions
            socket.on('add-reaction', async (data) => {
                try {
                    await this.handleAddReaction(socket, data);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle pinning messages
            socket.on('pin-message', async (data) => {
                try {
                    await this.handlePinMessage(socket, data);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle marking announcements
            socket.on('mark-announcement', async (data) => {
                try {
                    await this.handleMarkAnnouncement(socket, data);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle marking notifications as read
            socket.on('mark-notifications-read', async (notificationIds) => {
                try {
                    await this.handleMarkNotificationsRead(socket, notificationIds);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    async handleJoinEvent(socket, eventId) {
        // Verify user has access to this event
        const hasAccess = await this.verifyEventAccess(socket.user.id, eventId);
        if (!hasAccess) {
            throw new Error('Access denied: You are not registered for this event');
        }

        // Join the event room
        socket.join(eventId);
        
        // Track user in event room
        if (!this.eventRooms.has(eventId)) {
            this.eventRooms.set(eventId, new Set());
        }
        this.eventRooms.get(eventId).add(socket.user.id);

        // Notify others in room
        socket.to(eventId).emit('user-joined', {
            userId: socket.user.id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            userRole: socket.user.isOrganiser ? 'organizer' : 'participant'
        });

        // Send current unread notification count
        const unreadCount = await Notification.getUnreadCount(socket.user.id);
        socket.emit('notification-count', { count: unreadCount });

        console.log(`User ${socket.user.id} joined event ${eventId}`);
    }

    handleLeaveEvent(socket, eventId) {
        socket.leave(eventId);
        
        // Remove user from event room tracking
        if (this.eventRooms.has(eventId)) {
            this.eventRooms.get(eventId).delete(socket.user.id);
            if (this.eventRooms.get(eventId).size === 0) {
                this.eventRooms.delete(eventId);
            }
        }

        // Notify others in the room
        socket.to(eventId).emit('user-left', {
            userId: socket.user.id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`
        });

        console.log(`User ${socket.user.id} left event ${eventId}`);
    }

    async handleSendMessage(socket, messageData) {
        const { eventId, content, parentMessageId } = messageData;

        // Verify access
        const hasAccess = await this.verifyEventAccess(socket.user.id, eventId);
        if (!hasAccess) {
            throw new Error('Access denied: You are not registered for this event');
        }

        // Create message
        const message = new Message({
            eventId,
            senderId: socket.user.id,
            senderRole: socket.user.isOrganiser ? 'organizer' : 'participant',
            content,
            parentMessageId: parentMessageId || null
        });

        await message.save();
        await message.populate('senderId', 'firstName lastName');

        // Broadcast to all users in the event room
        this.io.to(eventId).emit('new-message', message);

        // Create notifications for other users in the event
        await this.createMessageNotifications(message, socket.user);

        console.log(`New message in event ${eventId} from ${socket.user.id}`);
    }

    async handleEditMessage(socket, data) {
        const { messageId, newContent } = data;

        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user can edit (only their own messages)
        if (message.senderId.toString() !== socket.user.id) {
            throw new Error('You can only edit your own messages');
        }

        // Add to edit history
        message.editHistory.push({
            content: message.content
        });

        message.content = newContent;
        await message.save();

        // Broadcast edit update
        this.io.to(message.eventId.toString()).emit('message-edited', {
            messageId,
            content: newContent,
            editHistory: message.editHistory
        });
    }

    async handleDeleteMessage(socket, data) {
        const { messageId } = data;

        const message = await Message.findById(messageId).populate('eventId');
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user can delete
        const canDelete = message.canDelete(socket.user.id, socket.user.isOrganiser ? 'organizer' : 'participant', message.eventId.organizerId);
        if (!canDelete) {
            throw new Error('You cannot delete this message');
        }

        message.isDeleted = true;
        message.deletedBy = socket.user.id;
        message.deletedAt = new Date();
        await message.save();

        // Broadcast deletion
        this.io.to(message.eventId.toString()).emit('message-deleted', {
            messageId,
            deletedBy: socket.user.id
        });
    }

    async handlePinMessage(socket, data) {
        const { messageId, isPinned } = data;

        const message = await Message.findById(messageId).populate('eventId');
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user can pin (only organizers)
        if (!message.canPin(socket.user.id, message.eventId.organizerId)) {
            throw new Error('Only organizers can pin messages');
        }

        message.isPinned = isPinned;
        await message.save();

        // Broadcast pin update
        this.io.to(message.eventId.toString()).emit('message-pinned', {
            messageId,
            isPinned,
            pinnedBy: socket.user.id
        });

        // Create notification for pinned message
        if (isPinned) {
            await this.createPinNotification(message, socket.user);
        }
    }

    async handleMarkAnnouncement(socket, data) {
        const { messageId, isAnnouncement } = data;

        const message = await Message.findById(messageId).populate('eventId');
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user can mark as announcement (only organizers)
        if (!message.canAnnounce(socket.user.id, message.eventId.organizerId)) {
            throw new Error('Only organizers can mark messages as announcements');
        }

        message.isAnnouncement = isAnnouncement;
        await message.save();

        // Broadcast announcement update
        this.io.to(message.eventId.toString()).emit('announcement-updated', {
            messageId,
            isAnnouncement,
            markedBy: socket.user.id
        });

        // Create notification for announcement
        if (isAnnouncement) {
            await this.createAnnouncementNotification(message, socket.user);
        }
    }

    async handleMarkNotificationsRead(socket, notificationIds) {
        await Notification.markAsRead(socket.user.id, notificationIds);
        
        // Send updated unread count
        const unreadCount = await Notification.getUnreadCount(socket.user.id);
        socket.emit('notification-count', { count: unreadCount });
    }

    async handleDisconnect(socket) {
        console.log(`User disconnected: ${socket.user.firstName} ${socket.user.lastName} (${socket.user.id})`);
        
        // Remove from tracking
        this.connectedUsers.delete(socket.user.id);
        this.userSockets.delete(socket.id);

        // Remove from all event rooms
        for (const [eventId, users] of this.eventRooms.entries()) {
            users.delete(socket.user.id);
            if (users.size === 0) {
                this.eventRooms.delete(eventId);
            } else {
                // Notify others in the room
                socket.to(eventId).emit('user-left', {
                    userId: socket.user.id,
                    userName: `${socket.user.firstName} ${socket.user.lastName}`
                });
            }
        }
    }

    async verifyEventAccess(userId, eventId) {
        // Check if user is organizer of the event
        const event = await Event.findById(eventId);
        if (event && event.organizerId.toString() === userId) {
            return true;
        }

        // Check if user is registered for the event
        const registration = await Registration.findOne({
            user: userId,
            event: eventId,
            status: { $in: ['confirmed', 'payment_approved'] }
        });

        return !!registration;
    }

    async createMessageNotifications(message, sender) {
        const eventUsers = await Registration.find({
            event: message.eventId,
            status: { $in: ['confirmed', 'payment_approved'] },
            user: { $ne: sender.id }
        }).populate('user', 'firstName lastName');

        const notifications = eventUsers.map(reg => ({
            userId: reg.user._id,
            eventId: message.eventId,
            messageId: message._id,
            type: message.parentMessageId ? 'REPLY' : 'NEW_MESSAGE',
            senderId: sender.id,
            senderName: `${sender.firstName} ${sender.lastName}`,
            messagePreview: message.content.substring(0, 100),
            parentMessageId: message.parentMessageId
        }));

        await Notification.insertMany(notifications);

        // Send real-time notifications
        for (const user of eventUsers) {
            const socketId = this.connectedUsers.get(user.user._id.toString());
            if (socketId) {
                this.io.to(socketId).emit('new-notification', {
                    type: message.parentMessageId ? 'REPLY' : 'NEW_MESSAGE',
                    senderName: `${sender.firstName} ${sender.lastName}`,
                    messagePreview: message.content.substring(0, 100),
                    eventId: message.eventId,
                    messageId: message._id
                });

                // Update unread count
                const unreadCount = await Notification.getUnreadCount(user.user._id);
                this.io.to(socketId).emit('notification-count', { count: unreadCount });
            }
        }
    }

    async createPinNotification(message, sender) {
        const eventUsers = await Registration.find({
            event: message.eventId,
            status: { $in: ['confirmed', 'payment_approved'] },
            user: { $ne: sender.id }
        });

        const notifications = eventUsers.map(reg => ({
            userId: reg.user._id,
            eventId: message.eventId,
            messageId: message._id,
            type: 'MESSAGE_PINNED',
            senderId: sender.id,
            senderName: `${sender.firstName} ${sender.lastName}`,
            messagePreview: message.content.substring(0, 100)
        }));

        await Notification.insertMany(notifications);

        // Send real-time notifications
        for (const user of eventUsers) {
            const socketId = this.connectedUsers.get(user.user._id.toString());
            if (socketId) {
                this.io.to(socketId).emit('new-notification', {
                    type: 'MESSAGE_PINNED',
                    senderName: `${sender.firstName} ${sender.lastName}`,
                    messagePreview: message.content.substring(0, 100),
                    eventId: message.eventId
                });
            }
        }
    }

    async createAnnouncementNotification(message, sender) {
        const eventUsers = await Registration.find({
            event: message.eventId,
            status: { $in: ['confirmed', 'payment_approved'] },
            user: { $ne: sender.id }
        });

        const notifications = eventUsers.map(reg => ({
            userId: reg.user._id,
            eventId: message.eventId,
            messageId: message._id,
            type: 'ANNOUNCEMENT',
            senderId: sender.id,
            senderName: `${sender.firstName} ${sender.lastName}`,
            messagePreview: message.content.substring(0, 100)
        }));

        await Notification.insertMany(notifications);

        // Send real-time notifications
        for (const user of eventUsers) {
            const socketId = this.connectedUsers.get(user.user._id.toString());
            if (socketId) {
                this.io.to(socketId).emit('new-notification', {
                    type: 'ANNOUNCEMENT',
                    senderName: `${sender.firstName} ${sender.lastName}`,
                    messagePreview: message.content.substring(0, 100),
                    eventId: message.eventId
                });
            }
        }
    }

    async handleAddReaction(socket, data) {
        const { messageId, emoji } = data;
        const userId = socket.user.id;

        // Validate emoji
        if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
            throw new Error('Invalid emoji');
        }

        // Find the message
        const Message = require('../models/Message');
        const message = await Message.findById(messageId).populate('eventId', 'organizerId');
        if (!message) {
            throw new Error('Message not found');
        }

        // Toggle reaction
        const result = message.toggleReaction(emoji, userId);
        await message.save();

        // Get user details
        const User = require('../models/User');
        const user = await User.findById(userId).select('firstName lastName');

        // Create notification for message author (if not self-reaction)
        const Notification = require('../models/Notification');
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

        // Broadcast reaction update to all users in the event
        this.io.to(message.eventId.toString()).emit('reaction-updated', {
            messageId: message._id,
            action: result.action,
            emoji: result.emoji,
            reactions: Object.fromEntries(result.reactions),
            userId: userId,
            userName: `${user.firstName} ${user.lastName}`
        });
    }

    // Method to get online users in an event
    getOnlineUsersInEvent(eventId) {
        const usersInEvent = this.eventRooms.get(eventId) || new Set();
        return Array.from(usersInEvent).map(userId => ({
            userId,
            isOnline: this.connectedUsers.has(userId)
        }));
    }
}

module.exports = SocketManager;
