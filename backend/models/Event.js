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
    }
});

const EventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    eventStartDate: { // Changed from 'date'
        type: Date,
        required: true
    },
    eventEndDate: {   // New field
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    organizerId: { // Changed from 'organizer'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventType: {
        type: String,
        enum: ['merch', 'ticket', 'rsvp'],
        required: true
    },
    items: [ItemSchema] // New field for merch items
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
