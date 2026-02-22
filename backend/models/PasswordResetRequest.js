const mongoose = require('mongoose');

const PasswordResetRequestSchema = new mongoose.Schema({
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clubName: {
        type: String,
        required: true
    },
    dateOfRequest: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminComments: {
        type: String,
        default: ''
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: {
        type: Date
    },
    newPassword: {
        type: String
    },
    // Password reset history
    resetHistory: [{
        resetDate: {
            type: Date,
            default: Date.now
        },
        resetBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        newPassword: String
    }]
}, {
    timestamps: true
});

// Index for faster lookups
PasswordResetRequestSchema.index({ organizerId: 1, status: 1 });
PasswordResetRequestSchema.index({ status: 1, dateOfRequest: -1 });

module.exports = mongoose.model('PasswordResetRequest', PasswordResetRequestSchema);
