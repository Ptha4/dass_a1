import io from 'socket.io-client';
import authService from './authService';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.eventId = null;
        this.callbacks = new Map();
    }

    // Initialize socket connection
    connect(token) {
        if (this.socket && this.connected) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            const authToken = token || authService.getToken();
            
            console.log('SocketService connect - token:', authToken ? 'Present' : 'Missing');
            console.log('SocketService connect - API_URL:', API_URL);
            
            this.socket = io(API_URL, {
                auth: {
                    token: authToken
                },
                transports: ['websocket']
            });

            this.socket.on('connect', () => {
                console.log('Connected to Socket.IO server');
                this.connected = true;
                resolve();
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
                this.connected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
                reject(error);
            });

            // Set up event listeners
            this.setupEventListeners();
        });
    }

    // Disconnect socket
    disconnect() {
        if (this.socket) {
            // Remove all socket event listeners
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.eventId = null;
            // Clear all callbacks
            this.callbacks.clear();
        }
    }

    // Join event room
    joinEvent(eventId) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.eventId = eventId;
        this.socket.emit('join-event', eventId);
    }

    // Leave event room
    leaveEvent() {
        if (!this.connected || !this.socket || !this.eventId) {
            return;
        }

        this.socket.emit('leave-event', this.eventId);
        this.eventId = null;
    }

    // Send message
    sendMessage(eventId, content, parentMessageId = null) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('send-message', {
            eventId,
            content,
            parentMessageId
        });
    }

    // Edit message
    editMessage(messageId, newContent) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('edit-message', { messageId, newContent });
    }

    // Add reaction to message
    addReaction(messageId, emoji) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('add-reaction', { messageId, emoji });
    }

    // Delete message
    deleteMessage(messageId) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('delete-message', { messageId });
    }

    // Pin/unpin message
    pinMessage(messageId, isPinned) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('pin-message', { messageId, isPinned });
    }

    // Mark/unmark announcement
    markAnnouncement(messageId, isAnnouncement) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('mark-announcement', { messageId, isAnnouncement });
    }

    // Mark notifications as read
    markNotificationsRead(notificationIds = null) {
        if (!this.connected || !this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit('mark-notifications-read', notificationIds);
    }

    // Register callback for events
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    // Remove callback for events
    off(event, callback) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Setup event listeners
    setupEventListeners() {
        if (!this.socket) return;

        // Message events
        this.socket.on('new-message', (data) => {
            this.triggerCallbacks('new-message', data);
        });

        this.socket.on('message-edited', (data) => {
            this.triggerCallbacks('message-edited', data);
        });

        this.socket.on('message-deleted', (data) => {
            this.triggerCallbacks('message-deleted', data);
        });

        this.socket.on('message-pinned', (data) => {
            this.triggerCallbacks('message-pinned', data);
        });

        this.socket.on('announcement-updated', (data) => {
            this.triggerCallbacks('announcement-updated', data);
        });

        this.socket.on('reaction-updated', (data) => {
            this.triggerCallbacks('reaction-updated', data);
        });

        // Notification events
        this.socket.on('new-notification', (data) => {
            this.triggerCallbacks('new-notification', data);
        });

        this.socket.on('notification-count', (data) => {
            this.triggerCallbacks('notification-count', data);
        });

        // User presence events
        this.socket.on('user-joined', (data) => {
            this.triggerCallbacks('user-joined', data);
        });

        this.socket.on('user-left', (data) => {
            this.triggerCallbacks('user-left', data);
        });

        // Error handling
        this.socket.on('error', (data) => {
            console.error('Socket.IO error:', data);
            this.triggerCallbacks('error', data);
        });
    }

    // Trigger callbacks for an event
    triggerCallbacks(event, data) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in callback for ${event}:`, error);
                }
            });
        }
    }

    // Get connection status
    isConnected() {
        return this.connected;
    }

    // Get current event ID
    getCurrentEventId() {
        return this.eventId;
    }
}

const socketService = new SocketService();
export default socketService;
