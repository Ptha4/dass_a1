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
        enum: ['pending', 'confirmed', 'cancelled', 'payment_pending', 'payment_approved', 'payment_rejected'],
        default: function() {
            // For merch events, default to payment_pending, otherwise confirmed
            return this.eventType === 'merch' ? 'payment_pending' : 'confirmed';
        }
    },
    // For merch events - payment proof and approval
    paymentProof: {
        proofImage: String, // URL to uploaded payment proof image
        uploadedAt: Date,
        approvedAt: Date,
        rejectedAt: Date,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rejectionReason: String
    },
    // For merch events, store purchased items and quantities
    purchasedItems: [
        {
            item: {
                itemName: String,
                stockQuantity: Number, // Snapshot of stock at purchase
                price: Number // Snapshot of price at purchase
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    // For merch events, total price paid for this registration
    totalCost: {
        type: Number,
        min: 0
    },
    // Reference to the generated ticket
    ticket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    }
}, { timestamps: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
