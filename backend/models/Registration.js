const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'confirmed'
    },
    // For merch events, store purchased items and quantities
    purchasedItems: [
        {
            item: {
                itemName: String,
                stockQuantity: Number // Snapshot of stock at purchase
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    // Reference to the generated ticket
    ticket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    }
}, { timestamps: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
