const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');

// @desc    Get all organizers/clubs for admin
// @route   GET /api/admin/organizers
// @access  Private/Admin
const getAdminOrganizers = asyncHandler(async (req, res) => {
    const organizers = await User.find({ 
        isOrganiser: true 
    })
    .select('-password')
    .sort({ createdAt: -1 });
    
    res.json(organizers);
});

// @desc    Create new organizer/club account
// @route   POST /api/admin/organizers
// @access  Private/Admin
const createOrganizer = asyncHandler(async (req, res) => {
    const { firstName, lastName, category, description, clubInterest } = req.body;

    // Validation
    if (!firstName || !lastName || !clubInterest) {
        res.status(400);
        throw new Error('First name, last name, and club interest are required');
    }

    // Generate email based on name
    const baseName = `${firstName.toLowerCase().replace(/\s+/g, '')}${lastName.toLowerCase().replace(/\s+/g, '')}`;
    const email = `${baseName}@clubs.iiit.ac.in`;

    // Generate random password
    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };
    const password = generatePassword();

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        res.status(400);
        throw new Error('An account with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create organizer
    const organizer = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isOrganiser: true,
        category: category || '',
        description: description || '',
        clubInterest,
        disabled: false,
        archived: false
    });

    await organizer.save();

    // Return credentials (without password hash)
    res.status(201).json({
        organizer: {
            _id: organizer._id,
            firstName: organizer.firstName,
            lastName: organizer.lastName,
            email: organizer.email,
            category: organizer.category,
            description: organizer.description,
            clubInterest: organizer.clubInterest,
            isOrganiser: organizer.isOrganiser,
            disabled: organizer.disabled,
            archived: organizer.archived
        },
        credentials: {
            email,
            password,
            message: 'Share these credentials with the club/organizer. They can log in immediately.'
        }
    });
});

// @desc    Update organizer status (disable/archive)
// @route   PATCH /api/admin/organizers/:id
// @access  Private/Admin
const updateOrganizerStatus = asyncHandler(async (req, res) => {
    const { disabled, archived } = req.body;
    const organizerId = req.params.id;

    const organizer = await User.findById(organizerId);
    if (!organizer || !organizer.isOrganiser) {
        res.status(404);
        throw new Error('Organizer not found');
    }

    // Update status
    if (disabled !== undefined) {
        organizer.disabled = disabled;
    }
    if (archived !== undefined) {
        organizer.archived = archived;
    }

    await organizer.save();

    // If archived, hide all their events
    if (archived) {
        await Event.updateMany(
            { organizerId: organizerId },
            { status: 'archived' }
        );
    } else if (archived === false) {
        // If unarchived, restore events to draft status
        await Event.updateMany(
            { organizerId: organizerId, status: 'archived' },
            { status: 'draft' }
        );
    }

    res.json({
        _id: organizer._id,
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email,
        category: organizer.category,
        description: organizer.description,
        clubInterest: organizer.clubInterest,
        isOrganiser: organizer.isOrganiser,
        disabled: organizer.disabled,
        archived: organizer.archived
    });
});

// @desc    Delete organizer permanently
// @route   DELETE /api/admin/organizers/:id
// @access  Private/Admin
const deleteOrganizer = asyncHandler(async (req, res) => {
    const organizerId = req.params.id;

    const organizer = await User.findById(organizerId);
    if (!organizer || !organizer.isOrganiser) {
        res.status(404);
        throw new Error('Organizer not found');
    }

    // Delete all events associated with this organizer
    await Event.deleteMany({ organizerId: organizerId });

    // Delete the organizer
    await User.findByIdAndDelete(organizerId);

    res.json({ message: 'Organizer and all associated data permanently deleted' });
});

module.exports = {
    getAdminOrganizers,
    createOrganizer,
    updateOrganizerStatus,
    deleteOrganizer
};
