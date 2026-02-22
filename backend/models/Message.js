const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: false,
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
        trim: true,
        maxlength: 2000
    },
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
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
        ref: 'User',
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    reactions: {
        type: Map,
        of: [mongoose.Schema.Types.ObjectId], // emoji -> array of user IDs
        default: new Map()
    }
}, {
    timestamps: true
});

// Indexes for optimal performance
MessageSchema.index({ eventId: 1, createdAt: -1 });
MessageSchema.index({ eventId: 1, isPinned: -1, createdAt: -1 });
MessageSchema.index({ eventId: 1, parentMessageId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, eventId: 1 });

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

// Method to add/remove reaction
MessageSchema.methods.toggleReaction = function(emoji, userId) {
    const emojiStr = emoji.toString();
    
    if (!this.reactions) {
        this.reactions = new Map();
    }
    
    const reactions = this.reactions.get(emojiStr) || [];
    const userIndex = reactions.indexOf(userId);
    
    if (userIndex > -1) {
        // Remove reaction
        reactions.splice(userIndex, 1);
        if (reactions.length === 0) {
            this.reactions.delete(emojiStr);
        } else {
            this.reactions.set(emojiStr, reactions);
        }
        return { action: 'removed', emoji, reactions: this.reactions };
    } else {
        // Add reaction
        reactions.push(userId);
        this.reactions.set(emojiStr, reactions);
        return { action: 'added', emoji, reactions: this.reactions };
    }
};

// Method to get user's reaction to a message
MessageSchema.methods.getUserReaction = function(userId) {
    if (!this.reactions) return null;
    
    for (const [emoji, users] of this.reactions.entries()) {
        if (users.includes(userId)) {
            return emoji;
        }
    }
    return null;
};

// Pre-save middleware to generate messageId (Mongoose 9+ uses async, no next callback)
MessageSchema.pre('save', async function() {
    if (this.isNew && !this.messageId) {
        this.messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
});

module.exports = mongoose.model('Message', MessageSchema);
