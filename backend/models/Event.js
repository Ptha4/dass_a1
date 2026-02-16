const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    // Price per unit for this merch item
    price: {
        type: Number,
        required: false,
        min: 0
    }
});

const EventSchema = new mongoose.Schema({
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
        enum: ['normal', 'merch', 'ticket', 'rsvp'],
        default: 'normal',
    },
    eligibility: {
        type: String,
    },
    location: {
        type: String,
        required: true,
        default: 'TBD',
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
        type: Array,
        default: [],
    },
    items: {
        type: [ItemSchema],
        default: [],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Event', EventSchema);
