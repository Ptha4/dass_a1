const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
    },
    eventDescription: {
        type: String,
        required: true,
    },
    eventType: {
        type: String,
        enum: ['normal', 'merch'],
        default: 'normal',
    },
    eligibility: {
        type: String,
    },
    registrationDeadline: {
        type: Date,
        required: true,
    },
    eventStartDate: {
        type: Date,
        required: true,
    },
    eventEndDate: {
        type: Date,
        required: true,
    },
    registrationLimit: {
        type: Number,
    },
    registrationFee: {
        type: Number,
        default: 0,
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    eventTags: {
        type: [String],
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'closed'],
        default: 'draft',
    },
    registrationForm: {
        type: Array, // Stores the structure of the custom registration form
        default: [],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Event', eventSchema);
