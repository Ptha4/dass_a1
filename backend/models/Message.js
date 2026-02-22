const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderRole: {
        type: String,
        enum: ['participant', 'organizer'],
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000,
        minlength: 1
    },
    parentMessageId: {
        type: String,
        default: null,
        ref: 'Message'
    },
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        emoji: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for optimal performance
MessageSchema.index({ eventId: 1, createdAt: -1 });
MessageSchema.index({ eventId: 1, isPinned: -1, createdAt: -1 });
MessageSchema.index({ eventId: 1, parentMessageId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, eventId: 1 });
MessageSchema.index({ messageId: 1 }, { unique: true });

// Virtual for getting replies
MessageSchema.virtual('replies', {
    ref: 'Message',
    localField: 'messageId',
    foreignField: 'parentMessageId'
});

// Method to check if user can delete message
MessageSchema.methods.canDelete = function(userId, userRole, eventOrganizerId) {
    // User can delete their own message
    if (this.senderId.toString() === userId.toString()) {
        return true;
    }
    
    // Organizers can delete any message in their event
    if (userRole === 'organizer' && eventOrganizerId.toString() === userId.toString()) {
        return true;
    }
    
    return false;
};

// Method to check if user can pin/unpin message
MessageSchema.methods.canPin = function(userId, eventOrganizerId) {
    return eventOrganizerId.toString() === userId.toString();
};

// Method to check if user can mark as announcement
MessageSchema.methods.canAnnounce = function(userId, eventOrganizerId) {
    return eventOrganizerId.toString() === userId.toString();
};

// Pre-save middleware to generate messageId
MessageSchema.pre('save', async function(next) {
    if (this.isNew && !this.messageId) {
        this.messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
});

module.exports = mongoose.model('Message', MessageSchema);
