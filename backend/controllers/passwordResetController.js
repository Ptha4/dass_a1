const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const User = require('../models/User');

// Helper function to generate secure random password
const generateSecurePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// @desc    Submit password reset request (for organizers)
// @route   POST /api/password-reset/request
// @access  Private/Organizer
const submitPasswordResetRequest = asyncHandler(async (req, res) => {
    const { clubName, reason } = req.body;
    const organizerId = req.user.id;

    // Validate input
    if (!clubName || !reason) {
        res.status(400);
        throw new Error('Club name and reason are required');
    }

    if (reason.length < 10) {
        res.status(400);
        throw new Error('Reason must be at least 10 characters long');
    }

    // Check if user is an organizer
    const organizer = await User.findById(organizerId);
    if (!organizer || !organizer.isOrganiser) {
        res.status(403);
        throw new Error('Only organizers can submit password reset requests');
    }

    // Check if there's already a pending request for this organizer
    const existingPendingRequest = await PasswordResetRequest.findOne({
        organizerId,
        status: 'pending'
    });

    if (existingPendingRequest) {
        res.status(400);
        throw new Error('You already have a pending password reset request. Please wait for it to be processed.');
    }

    // Create new password reset request
    const resetRequest = new PasswordResetRequest({
        organizerId,
        clubName,
        reason,
        status: 'pending'
    });

    await resetRequest.save();

    res.status(201).json({
        message: 'Password reset request submitted successfully. Please wait for admin approval.',
        request: {
            id: resetRequest._id,
            clubName: resetRequest.clubName,
            dateOfRequest: resetRequest.dateOfRequest,
            status: resetRequest.status
        }
    });
});

// @desc    Get all password reset requests (for admin)
// @route   GET /api/password-reset/requests
// @access  Private/Admin
const getAllPasswordResetRequests = asyncHandler(async (req, res) => {
    // Check if user is admin (you might want to add an isAdmin field to User model)
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
        res.status(403);
        throw new Error('Only admins can view password reset requests');
    }

    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        query.status = status;
    }

    const skip = (page - 1) * limit;

    const requests = await PasswordResetRequest.find(query)
        .populate('organizerId', 'firstName lastName email')
        .populate('processedBy', 'firstName lastName email')
        .sort({ dateOfRequest: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await PasswordResetRequest.countDocuments(query);

    res.json({
        requests,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Approve or reject password reset request (for admin)
// @route   PATCH /api/password-reset/:requestId/process
// @access  Private/Admin
const processPasswordResetRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { approved, adminComments } = req.body;

    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
        res.status(403);
        throw new Error('Only admins can process password reset requests');
    }

    if (typeof approved !== 'boolean') {
        res.status(400);
        throw new Error('Approved status must be true or false');
    }

    // Find the reset request
    const resetRequest = await PasswordResetRequest.findById(requestId)
        .populate('organizerId', 'firstName lastName email');

    if (!resetRequest) {
        res.status(404);
        throw new Error('Password reset request not found');
    }

    if (resetRequest.status !== 'pending') {
        res.status(400);
        throw new Error('This request has already been processed');
    }

    let newPassword = null;

    if (approved) {
        // Generate new password
        newPassword = generateSecurePassword();
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update organizer's password
        await User.findByIdAndUpdate(resetRequest.organizerId._id, {
            password: hashedPassword
        });

        // Add to reset history
        resetRequest.resetHistory.push({
            resetDate: new Date(),
            resetBy: req.user.id,
            reason: resetRequest.reason,
            newPassword: newPassword
        });
    }

    // Update the reset request
    resetRequest.status = approved ? 'approved' : 'rejected';
    resetRequest.adminComments = adminComments || '';
    resetRequest.processedBy = req.user.id;
    resetRequest.processedAt = new Date();
    resetRequest.newPassword = newPassword; // Only set if approved

    await resetRequest.save();

    res.json({
        message: approved 
            ? 'Password reset request approved. New password generated.' 
            : 'Password reset request rejected.',
        request: {
            id: resetRequest._id,
            organizerName: `${resetRequest.organizerId.firstName} ${resetRequest.organizerId.lastName}`,
            clubName: resetRequest.clubName,
            status: resetRequest.status,
            adminComments: resetRequest.adminComments,
            processedAt: resetRequest.processedAt,
            newPassword: newPassword // Only included if approved
        }
    });
});

// @desc    Get password reset history for an organizer
// @route   GET /api/password-reset/history/:organizerId
// @access  Private/Admin
const getOrganizerResetHistory = asyncHandler(async (req, res) => {
    const { organizerId } = req.params;

    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
        res.status(403);
        throw new Error('Only admins can view password reset history');
    }

    const requests = await PasswordResetRequest.find({ organizerId })
        .populate('organizerId', 'firstName lastName email')
        .populate('processedBy', 'firstName lastName email')
        .sort({ dateOfRequest: -1 });

    res.json({
        organizer: requests[0]?.organizerId || null,
        resetHistory: requests.map(request => ({
            requestId: request._id,
            clubName: request.clubName,
            dateOfRequest: request.dateOfRequest,
            reason: request.reason,
            status: request.status,
            adminComments: request.adminComments,
            processedBy: request.processedBy,
            processedAt: request.processedAt,
            resetHistory: request.resetHistory
        }))
    });
});

// @desc    Get my password reset requests (for organizer)
// @route   GET /api/password-reset/my-requests
// @access  Private/Organizer
const getMyPasswordResetRequests = asyncHandler(async (req, res) => {
    const organizerId = req.user.id;

    const requests = await PasswordResetRequest.find({ organizerId })
        .populate('processedBy', 'firstName lastName email')
        .sort({ dateOfRequest: -1 });

    res.json({
        requests: requests.map(request => ({
            id: request._id,
            clubName: request.clubName,
            dateOfRequest: request.dateOfRequest,
            reason: request.reason,
            status: request.status,
            adminComments: request.adminComments,
            processedAt: request.processedAt,
            processedBy: request.processedBy
        }))
    });
});

module.exports = {
    submitPasswordResetRequest,
    getAllPasswordResetRequests,
    processPasswordResetRequest,
    getOrganizerResetHistory,
    getMyPasswordResetRequests
};
