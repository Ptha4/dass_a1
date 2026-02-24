const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { 
    registerEvent, 
    getMyTickets, 
    uploadPaymentProof, 
    getPendingApprovals, 
    approvePayment,
    checkRegistrationStatus,
    checkEventHasRegistrations
} = require('../controllers/registrationController');
const { protect } = require('../middleware/auth'); // Assuming you have an auth middleware

// Configure multer for file uploads (memory storage for database)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only allow one file at a time
    }
});

router.post('/:eventId', protect, registerEvent);
router.get('/my-tickets', protect, getMyTickets);
router.get('/:eventId/status', protect, checkRegistrationStatus);
router.get('/event/:id/has-registrations', protect, checkEventHasRegistrations);

// Payment proof upload - MUST come before generic /:eventId route
router.post('/:registrationId/payment-proof', protect, (req, res, next) => {
    console.log('=== PAYMENT PROOF UPLOAD DEBUG ===');
    console.log('req.params.registrationId:', req.params.registrationId);
    
    upload.single('paymentProof')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: err.message });
        }
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ message: 'No payment proof image uploaded' });
        }
        console.log('File uploaded successfully:', req.file);
        next();
    });
}, uploadPaymentProof);

// Organizer payment approval endpoints
router.get('/pending-approvals', protect, getPendingApprovals);
router.patch('/:registrationId/approve-payment', protect, approvePayment);

module.exports = router;
