const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    submitPasswordResetRequest,
    getAllPasswordResetRequests,
    processPasswordResetRequest,
    getOrganizerResetHistory,
    getMyPasswordResetRequests
} = require('../controllers/passwordResetController');

// Organizer submits password reset request
router.post('/request', protect, submitPasswordResetRequest);

// Get all password reset requests (Admin only)
router.get('/requests', protect, getAllPasswordResetRequests);

// Process password reset request (approve/reject) (Admin only)
router.patch('/:requestId/process', protect, processPasswordResetRequest);

// Get password reset history for specific organizer (Admin only)
router.get('/history/:organizerId', protect, getOrganizerResetHistory);

// Get my password reset requests (Organizer only)
router.get('/my-requests', protect, getMyPasswordResetRequests);

module.exports = router;
