const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    registration: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true,
        unique: true // One ticket per registration
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    qrCodeData: {
        type: String, // Store the data that will be encoded in the QR code
        required: true
    },
    // Additional details to be displayed on the ticket
    eventName: String,
    eventDate: Date,
    eventLocation: String,
    participantName: String,
    participantEmail: String,
    // For merch events, details of purchased items
    purchasedItemsDetails: [
        {
            itemName: String,
            quantity: Number
        }
    ],
    issuedAt: {
        type: Date,
        default: Date.now
    },
    isValid: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
