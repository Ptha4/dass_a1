const mongoose = require('mongoose');

const PaymentProofSchema = new mongoose.Schema({
    // Reference to registration
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true,
        unique: true
    },
    
    // Reference to user who uploaded
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Reference to event
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    
    // File information
    fileName: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    
    // Storage information
    filePath: {
        type: String,
        required: true
    },
    publicUrl: {
        type: String,
        required: true
    },
    
    // Metadata
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    
    // Approval status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    
    // Review information
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    reviewNotes: {
        type: String
    },
    
    // Rejection information
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for better query performance
PaymentProofSchema.index({ userId: 1 });
PaymentProofSchema.index({ eventId: 1 });
PaymentProofSchema.index({ status: 1 });
PaymentProofSchema.index({ uploadedAt: -1 });

module.exports = mongoose.model('PaymentProof', PaymentProofSchema);
