const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    registration: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true
    },
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scannedAt: {
        type: Date,
        default: Date.now
    },
    scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scanMethod: {
        type: String,
        enum: ['camera', 'file_upload', 'manual_override'],
        default: 'camera'
    },
    status: {
        type: String,
        enum: ['scanned', 'rejected', 'manual'],
        default: 'scanned'
    },
    notes: {
        type: String,
        default: ''
    },
    // For manual overrides
    manualOverrideReason: {
        type: String,
        default: ''
    },
    // For rejected scans
    rejectionReason: {
        type: String,
        default: ''
    },
    // Audit trail
    auditLog: [{
        action: String,
        timestamp: Date,
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        details: String
    }]
}, {
    timestamps: true
});

// Index for quick lookups
AttendanceSchema.index({ event: 1, participant: 1 }, { unique: true });
AttendanceSchema.index({ event: 1, scannedAt: 1 });
AttendanceSchema.index({ scannedAt: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
