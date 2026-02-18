const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
    scanQRCode, 
    getEventAttendance, 
    manualOverride, 
    exportAttendanceCSV 
} = require('../controllers/attendanceController');

// QR code scanning
router.post('/scan', protect, scanQRCode);

// Get attendance data for event
router.get('/:eventId', protect, getEventAttendance);

// Manual override
router.post('/manual-override', protect, manualOverride);

// Export attendance as CSV
router.get('/:eventId/export', protect, exportAttendanceCSV);

module.exports = router;
