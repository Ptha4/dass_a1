const express = require('express');
const {
    getAdminOrganizers,
    createOrganizer,
    updateOrganizerStatus,
    deleteOrganizer
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ msg: 'Access denied. Admin rights required.' });
    }
    next();
};

// Apply authentication and admin check to all routes
router.use(protect);
router.use(requireAdmin);

// @route   GET /api/admin/organizers
// @desc    Get all organizers for admin
// @access  Private/Admin
router.get('/organizers', getAdminOrganizers);

// @route   POST /api/admin/organizers
// @desc    Create new organizer
// @access  Private/Admin
router.post('/organizers', createOrganizer);

// @route   PATCH /api/admin/organizers/:id
// @desc    Update organizer status
// @access  Private/Admin
router.patch('/organizers/:id', updateOrganizerStatus);

// @route   DELETE /api/admin/organizers/:id
// @desc    Delete organizer
// @access  Private/Admin
router.delete('/organizers/:id', deleteOrganizer);

module.exports = router;
