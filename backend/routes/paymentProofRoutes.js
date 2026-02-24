const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const PaymentProof = require('../models/PaymentProof');

// @desc    Get payment proof image by ID
// @route   GET /api/payment-proofs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        console.log('=== GET PAYMENT PROOF IMAGE ===');
        console.log('Payment proof ID:', req.params.id);
        console.log('User ID:', req.user.id);

        const paymentProof = await PaymentProof.findById(req.params.id);
        
        if (!paymentProof) {
            console.log('Payment proof not found');
            return res.status(404).json({ message: 'Payment proof not found' });
        }

        // Check if user owns this payment proof or is organizer
        const registration = await require('../models/Registration').findById(paymentProof.registrationId)
            .populate('event');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        const isOwner = registration.user.toString() === req.user.id;
        const isOrganizer = registration.event && registration.event.organizerId && 
            registration.event.organizerId.toString() === req.user.id;

        if (!isOwner && !isOrganizer) {
            console.log('Access denied - not owner or organizer');
            return res.status(403).json({ message: 'Not authorized to view this payment proof' });
        }

        console.log('Access granted - serving payment proof image from database');
        console.log('Image data URL format:', paymentProof.publicUrl.startsWith('data:') ? 'base64 data URL' : 'file path');

        // Check if it's a base64 data URL or file path
        if (paymentProof.publicUrl.startsWith('data:')) {
            // Serve base64 image directly
            const base64Data = paymentProof.publicUrl.split(',')[1]; // Remove data:image/png;base64, part
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            res.setHeader('Content-Type', paymentProof.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${paymentProof.originalName}"`);
            res.send(imageBuffer);
        } else {
            // Fallback for file paths (shouldn't happen with new implementation)
            const fs = require('fs');
            if (fs.existsSync(paymentProof.filePath)) {
                res.setHeader('Content-Type', paymentProof.mimeType);
                res.setHeader('Content-Disposition', `inline; filename="${paymentProof.originalName}"`);
                const fileStream = fs.createReadStream(paymentProof.filePath);
                fileStream.pipe(res);
            } else {
                return res.status(404).json({ message: 'Payment proof image file not found' });
            }
        }
    } catch (error) {
        console.error('Error serving payment proof:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// @desc    Get payment proof details by ID
// @route   GET /api/payment-proofs/:id/details
// @access  Private
router.get('/:id/details', protect, async (req, res) => {
    try {
        const paymentProof = await PaymentProof.findById(req.params.id)
            .populate({
                path: 'registrationId',
                populate: [
                    { path: 'event', select: 'eventName eventType' },
                    { path: 'user', select: 'firstName lastName email' }
                ]
            });

        if (!paymentProof) {
            return res.status(404).json({ message: 'Payment proof not found' });
        }

        // Check authorization
        const registration = paymentProof.registrationId;
        const isOwner = registration.user.toString() === req.user.id;
        const isOrganizer = registration.event && registration.event.organizerId && 
            registration.event.organizerId.toString() === req.user.id;

        if (!isOwner && !isOrganizer) {
            return res.status(403).json({ message: 'Not authorized to view this payment proof' });
        }

        res.json(paymentProof);
    } catch (error) {
        console.error('Error getting payment proof details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
