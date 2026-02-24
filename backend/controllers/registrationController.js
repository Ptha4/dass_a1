const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid'); // For unique ticket IDs
const QRCode = require('qrcode'); // For QR code generation
const nodemailer = require('nodemailer'); // For sending emails
const mongoose = require('mongoose');

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User'); // To populate user details for ticket
const PaymentProof = require('../models/PaymentProof'); // For payment proof database storage

// Configure Nodemailer (replace with your actual email service details)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Helper function to generate QR code data URL
const generateQrCodeDataURL = async (data) => {
    try {
        return await QRCode.toDataURL(JSON.stringify(data));
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw new Error('Failed to generate QR code.');
    }
};

// Helper function to send email (skips if EMAIL_HOST not configured)
const sendEmail = async (to, subject, htmlContent) => {
    console.log('=== EMAIL SENDING DEBUG ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
        console.warn('Email not configured (EMAIL_HOST/EMAIL_USER). Skipping send.');
        console.warn('Please set up email environment variables:');
        console.warn('- EMAIL_HOST: SMTP server hostname');
        console.warn('- EMAIL_USER: SMTP username');
        console.warn('- EMAIL_PASS: SMTP password');
        console.warn('- EMAIL_PORT: SMTP port (usually 587 or 465)');
        console.warn('- EMAIL_SECURE: true for 465, false for other ports');
        console.warn('- EMAIL_FROM: From email address');
        return;
    }
    try {
        console.log('Attempting to send email...');
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html: htmlContent,
        });
        console.log(`✅ Email sent successfully to ${to}`);
    } catch (err) {
        console.error('❌ Error sending email:', err);
        console.error('Error details:', err.message);
        // In a real application, you might want to log this error and potentially retry
    }
    console.log('=== END EMAIL DEBUG ===');
};

// @desc    Register for an event or purchase merchandise
// @route   POST /api/register/:eventId
// @access  Private
const registerEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { purchasedItems, customFormResponses } = req.body; // Add customFormResponses

    const event = await Event.findById(eventId);

    if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }

    const existingRegistration = await Registration.findOne({ user: req.user.id, event: eventId });
    if (existingRegistration) {
        const err = new Error('You are already registered for this event.');
        err.status = 400;
        throw err;
    }

    if (new Date() > event.registrationDeadline) {
        const err = new Error('Registration deadline has passed.');
        err.status = 400;
        throw err;
    }

    if (event.eventType !== 'merch' && event.registrationLimit && await Registration.countDocuments({ event: eventId }) >= event.registrationLimit) {
        const err = new Error('Event registration limit reached.');
        err.status = 400;
        throw err;
    }

    const userDetails = await User.findById(req.user.id).select('firstName lastName email participantType');
    if (!userDetails) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
    }

    // Enforce event eligibility: only allow registration if user's participantType matches
    const eventEligibility = (event.eligibility || '').trim();
    if (eventEligibility === 'IIIT Participant') {
        if (userDetails.participantType !== 'IIIT Participant') {
            const err = new Error('This event is only open to IIIT participants. You are not eligible to register.');
            err.status = 403;
            throw err;
        }
    }
    // 'IIIT and Non-IIIT Participant' or empty: allow both IIIT and Non-IIIT participants (no extra check)

    let registration;
    let ticket;

    if (event.eventType === 'merch') {
        if (!purchasedItems || !Array.isArray(purchasedItems) || purchasedItems.length === 0) {
            const err = new Error('Merchandise events require purchased items.');
            err.status = 400;
            throw err;
        }

        let totalCost = 0;
        const itemsToPurchase = [];
        const updatedEventItems = [...event.items]; // Create a mutable copy

        // Check existing registrations for this user to enforce purchase limits
        const existingRegistrations = await Registration.find({
            user: req.user.id,
            event: eventId,
            status: { $in: ['payment_pending', 'payment_approved', 'confirmed'] }
        }).populate('purchasedItems.item');

        // Calculate current quantities purchased by this user for this event
        const currentPurchases = {};

        existingRegistrations.forEach(reg => {
            if (reg.purchasedItems && Array.isArray(reg.purchasedItems)) {
                reg.purchasedItems.forEach(purchasedItem => {
                    const itemName = purchasedItem.item.itemName;
                    currentPurchases[itemName] = (currentPurchases[itemName] || 0) + purchasedItem.quantity;
                });
            }
        });

        console.log('Current item purchases:', currentPurchases);

        for (const itemPurchase of purchasedItems) {
            const eventItemIndex = updatedEventItems.findIndex(ei => ei._id.toString() === itemPurchase.itemId);

            if (eventItemIndex === -1) {
                const err = new Error(`Item with ID ${itemPurchase.itemId} not found in event merchandise.`);
                err.status = 400;
                throw err;
            }

            const eventItem = updatedEventItems[eventItemIndex];

            if (itemPurchase.quantity <= 0) {
                const err = new Error(`Quantity for item ${eventItem.itemName} must be at least 1.`);
                err.status = 400;
                throw err;
            }

            // Check item-level purchase limit
            const currentItemQuantity = (currentPurchases[eventItem.itemName] || 0) + itemPurchase.quantity;
            if (eventItem.purchaseLimitPerParticipant > 0 && currentItemQuantity > eventItem.purchaseLimitPerParticipant) {
                const err = new Error(`Purchase limit exceeded for ${eventItem.itemName}. You can purchase maximum ${eventItem.purchaseLimitPerParticipant} per participant. You already have ${currentPurchases[eventItem.itemName] || 0} and are trying to add ${itemPurchase.quantity}.`);
                err.status = 400;
                throw err;
            }

            if (eventItem.stockQuantity < itemPurchase.quantity) {
                const err = new Error(`Not enough stock for ${eventItem.itemName}. Available: ${eventItem.stockQuantity}`);
                err.status = 400;
                throw err;
            }

            // Total cost = sum of quantity * price per item
            const price = Number(eventItem.price || 0);

            // Decrement stock
            updatedEventItems[eventItemIndex].stockQuantity -= itemPurchase.quantity;
            itemsToPurchase.push({
                item: {
                    itemName: eventItem.itemName,
                    stockQuantity: eventItem.stockQuantity + itemPurchase.quantity, // Snapshot of original stock
                    price: price // Snapshot of price at purchase
                },
                quantity: itemPurchase.quantity,
                price: price // Price is required at this level too
            });

            totalCost += itemPurchase.quantity * price;
        }

        // Save updated event with decremented stock
        event.items = updatedEventItems;
        await event.save();

        registration = new Registration({
            user: req.user.id,
            event: eventId,
            purchasedItems: itemsToPurchase,
            status: 'payment_pending',
            totalCost,
            customFormResponses: customFormResponses || {}
        });
        await registration.save();

        // Send confirmation email for merch registration (no ticket yet)
        const emailHtml = `
            <h1>Merchandise Registration Confirmation</h1>
            <p>Dear ${userDetails.firstName} ${userDetails.lastName},</p>
            <p>Thank you for registering for ${event.eventName}!</p>
            <p><strong>Event:</strong> ${event.eventName}</p>
            <p><strong>Date:</strong> ${event.eventStartDate.toDateString()}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Total Cost:</strong> ₹${totalCost}</p>
            <p><strong>Purchased Items:</strong></p>
            <ul>
                ${itemsToPurchase.map(item => `<li>${item.item.itemName} (x${item.quantity}) - ₹${item.quantity * item.price}</li>`).join('')}
            </ul>
            <p>Please upload your payment proof to complete your registration. You will receive your ticket after payment approval.</p>
        `;
        await sendEmail(userDetails.email, `Registration Confirmation for ${event.eventName}`, emailHtml);

    } else { // Normal or Ticket Event
        registration = new Registration({
            user: req.user.id,
            event: eventId,
            status: 'confirmed',
            customFormResponses: customFormResponses || {}
        });
        await registration.save();

        // Generate Ticket for Normal/Ticket Event
        const ticketId = uuidv4();
        const qrCodeContent = {
            ticketId,
            userId: req.user.id,
            eventId: event._id,
            eventType: event.eventType,
        };
        const qrCodeDataURL = await generateQrCodeDataURL(qrCodeContent);

        ticket = new Ticket({
            registration: registration._id,
            event: event._id,
            user: req.user.id,
            ticketId,
            qrCodeData: qrCodeDataURL,
            eventName: event.eventName,
            eventDate: event.eventStartDate,
            eventLocation: event.location,
            participantName: `${userDetails.firstName} ${userDetails.lastName}`,
            participantEmail: userDetails.email,
        });
        await ticket.save();

        registration.ticket = ticket._id;
        await registration.save();

        // Send ticket to participant via email
        const emailHtml = `
            <h1>Event Registration Confirmation & Ticket</h1>
            <p>Dear ${userDetails.firstName} ${userDetails.lastName},</p>
            <p>Thank you for registering for <strong>${event.eventName}</strong>!</p>
            <p><strong>Event:</strong> ${event.eventName}</p>
            <p><strong>Date:</strong> ${event.eventStartDate ? new Date(event.eventStartDate).toDateString() : 'TBD'}</p>
            <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p>Your QR code ticket is below. You can also view this ticket anytime in your Participation History on the dashboard.</p>
            <img src="${qrCodeDataURL}" alt="QR Code Ticket" style="max-width: 200px; height: auto;" />
            <p>We look forward to seeing you!</p>
        `;
        await sendEmail(userDetails.email, `Your Ticket for ${event.eventName}`, emailHtml);
    }

    const responseData = {
        message: event.eventType === 'merch'
            ? 'Registration successful! Please upload payment proof to receive your ticket.'
            : 'Registration successful and ticket sent!',
        registration: {
            ...registration.toObject(),
            _id: registration._id
        }
    };

    if (ticket) {
        responseData.ticket = ticket;
    }

    res.status(201).json(responseData);
});

// @desc    Get user's registrations/tickets
// @route   GET /api/register/my-tickets
// @access  Private
const getMyTickets = asyncHandler(async (req, res) => {
    const registrations = await Registration.find({ user: req.user.id })
        .populate('event', 'eventName eventStartDate eventEndDate location eventType')
        .populate('ticket');

    res.json(registrations);
});

// @desc    Upload payment proof for merchandise registration
// @route   POST /api/register/:registrationId/payment-proof
// @access  Private
const uploadPaymentProof = async (req, res) => {
    try {
        const registrationId = req.params.registrationId;

        console.log('=== UPLOAD PAYMENT PROOF CONTROLLER ===');
        console.log('registrationId:', registrationId);
        console.log('req.file:', req.file);
        console.log('req.user.id:', req.user?.id);

        if (!req.file) {
            res.status(400);
            return res.json({ message: 'No payment proof image uploaded' });
        }

        const registration = await Registration.findById(registrationId)
            .populate('event');

        console.log('Found registration:', registration);

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check if registration belongs to user
        if (registration.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to upload payment proof for this registration' });
        }

        // Check if this is a merch event
        if (registration.event.eventType !== 'merch') {
            return res.status(400).json({ message: 'Payment proof is only required for merchandise events' });
        }

        // Check if payment proof has already been uploaded
        console.log('=== CHECKING EXISTING PAYMENT PROOF ===');
        console.log('Looking for payment proof with registrationId:', registrationId);

        const existingProof = await PaymentProof.findOne({ registrationId });
        console.log('Existing proof found:', existingProof ? 'YES' : 'NO');
        if (existingProof) {
            console.log('Existing proof details:', {
                id: existingProof._id,
                status: existingProof.status,
                uploadedAt: existingProof.uploadedAt,
                fileName: existingProof.fileName
            });
            console.log('Payment proof already exists');
            return res.status(400).json({ message: 'Payment proof has already been uploaded' });
        }
        console.log('=== END CHECKING EXISTING PAYMENT PROOF ===');

        // Convert image to base64 for database storage
        console.log('=== CONVERTING IMAGE TO BASE64 ===');
        console.log('Original file size:', req.file.size, 'bytes');

        const imageBuffer = req.file.buffer;
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        console.log('Base64 conversion completed');
        console.log('Base64 string length:', base64Image.length, 'characters');
        console.log('Data URL length:', dataUrl.length, 'characters');
        console.log('=== END BASE64 CONVERSION ===');

        // Create payment proof record in database with image data
        console.log('=== CREATING PAYMENT PROOF OBJECT ===');
        const paymentProof = new PaymentProof({
            registrationId,
            userId: req.user.id,
            eventId: registration.event._id,
            fileName: req.file.originalname,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            filePath: dataUrl, // Store as data URL
            publicUrl: dataUrl, // Serve as data URL
            status: 'pending'
        });
        console.log('Payment proof object created successfully');
        console.log('=== END CREATING PAYMENT PROOF OBJECT ===');

        console.log('=== PAYMENT PROOF CREATION DEBUG ===');
        console.log('Creating payment proof with data:', {
            registrationId,
            userId: req.user.id,
            eventId: registration.event._id,
            eventOrganizerId: registration.event.organizerId,
            fileName: req.file.originalname,
            status: 'pending'
        });

        try {
            await paymentProof.save();
            console.log('Payment proof saved successfully with ID:', paymentProof._id);
            console.log('=== END PAYMENT PROOF CREATION DEBUG ===');
        } catch (saveError) {
            console.error('ERROR saving payment proof:', saveError);
            console.error('Save error details:', {
                name: saveError.name,
                message: saveError.message,
                code: saveError.code
            });
            return res.status(500).json({
                message: `Failed to save payment proof: ${saveError.message}`
            });
        }

        // Update registration with payment proof reference
        registration.paymentProof = {
            proofImage: paymentProof._id,
            uploadedAt: new Date()
        };
        registration.status = 'payment_pending';
        await registration.save();

        console.log('Registration saved successfully with payment proof reference');

        res.json({
            message: 'Payment proof uploaded successfully. Waiting for approval.',
            registration,
            paymentProof: {
                id: paymentProof._id,
                fileName: paymentProof.fileName,
                uploadedAt: paymentProof.uploadedAt,
                status: paymentProof.status,
                imageUrl: paymentProof.publicUrl // Include data URL for frontend display
            }
        });
    } catch (error) {
        console.error('UPLOAD PAYMENT PROOF ERROR:', error);
        res.status(500).json({ message: 'Internal server error during payment proof upload' });
    }
};

// @desc    Get all pending payment approvals for organizer
// @route   GET /api/register/pending-approvals
// @access  Private/Organizer
const getPendingApprovals = asyncHandler(async (req, res) => {
    console.log('=== GET PENDING APPROVALS START ===');
    console.log('Organizer ID:', req.user.id);
    console.log('Is organizer:', req.user.isOrganiser);

    if (!req.user.isOrganiser) {
        console.log('User is not an organizer');
        res.status(403);
        throw new Error('Not authorized. Only organizers can view pending approvals');
    }

    console.log('=== GET PENDING APPROVALS ===');
    console.log('Organizer ID:', req.user.id);

    // First, get all events for this organizer
    const Event = require('../models/Event');
    const organizerEvents = await Event.find({ organizerId: req.user.id }).select('_id');
    const organizerEventIds = organizerEvents.map(event => event._id);

    console.log('Organizer events:', organizerEventIds.length);

    // Get all payment proofs for this organizer's events that are pending
    const paymentProofs = await PaymentProof.find({
        status: 'pending',
        eventId: { $in: organizerEventIds }
    })
        .populate('userId', 'firstName lastName email')
        .populate('eventId', 'eventName eventType')
        .populate('registrationId', 'user event totalCost purchasedItems')
        .sort({ uploadedAt: -1 });

    console.log(`Found ${paymentProofs.length} pending payment proofs for organizer`);

    // Log details for debugging
    paymentProofs.forEach((proof, index) => {
        console.log(`Payment Proof ${index + 1}:`, {
            id: proof._id,
            status: proof.status,
            eventId: proof.eventId,
            registrationId: proof.registrationId,
            userId: proof.userId,
            uploadedAt: proof.uploadedAt
        });
    });

    // Transform data for frontend consumption
    const transformedProofs = paymentProofs.map(proof => ({
        _id: proof._id,
        status: proof.status,
        uploadedAt: proof.uploadedAt,
        fileName: proof.fileName,
        originalName: proof.originalName,
        fileSize: proof.fileSize,
        mimeType: proof.mimeType,
        publicUrl: proof.publicUrl,
        eventId: proof.eventId._id,
        eventName: proof.eventId.eventName,
        eventType: proof.eventId.eventType,
        userId: proof.userId._id,
        user: proof.userId,
        registrationId: proof.registrationId._id,
        registration: proof.registrationId,
        totalCost: proof.registrationId?.totalCost || 0,
        purchasedItems: proof.registrationId?.purchasedItems || []
    }));

    console.log('Transformed payment proofs for frontend:', transformedProofs.length);
    transformedProofs.forEach((proof, index) => {
        console.log(`Transformed Proof ${index + 1}:`, {
            id: proof._id,
            eventName: proof.eventName,
            userName: proof.user?.firstName + ' ' + proof.user?.lastName,
            status: proof.status,
            hasEventName: !!proof.eventName,
            hasUser: !!proof.user
        });
    });

    console.log('=== FINAL API RESPONSE ===');
    console.log('Response data type:', typeof transformedProofs);
    console.log('Response is array:', Array.isArray(transformedProofs));
    console.log('Response length:', transformedProofs.length);

    if (transformedProofs.length > 0) {
        console.log('First proof structure:', JSON.stringify(transformedProofs[0], null, 2));
    } else {
        console.log('No payment proofs found');
    }
    console.log('=== END API RESPONSE ===');

    res.json(transformedProofs);
});

// @desc    Approve or reject payment
// @route   PATCH /api/register/:registrationId/approve-payment
// @access  Private/Organizer
const approvePayment = asyncHandler(async (req, res) => {
    const { proofId } = req.params;
    const { approved, rejectionReason } = req.body;

    if (typeof approved !== 'boolean') {
        res.status(400);
        throw new Error('Approved must be true or false');
    }

    const paymentProof = await PaymentProof.findById(proofId);
    if (!paymentProof) {
        res.status(404);
        throw new Error('Payment proof not found');
    }

    const registration = await Registration.findById(paymentProof.registrationId)
        .populate('event')
        .populate('user');

    if (!registration) {
        res.status(404);
        throw new Error('Registration not found');
    }

    // Check organizer
    if (registration.event.organizerId.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized');
    }

    if (paymentProof.status !== 'pending') {
        res.status(400);
        throw new Error('Payment already processed');
    }

    if (approved) {
        paymentProof.status = 'approved';
        paymentProof.reviewedBy = req.user.id;
        paymentProof.reviewedAt = new Date();
        await paymentProof.save();

        registration.status = 'payment_approved';
    } else {
        paymentProof.status = 'rejected';
        paymentProof.reviewedBy = req.user.id;
        paymentProof.reviewedAt = new Date();
        paymentProof.reviewNotes = rejectionReason || 'Rejected by organizer';
        await paymentProof.save();

        registration.status = 'payment_rejected';
    }

    await registration.save();

    res.json({
        message: approved ? 'Payment approved successfully' : 'Payment rejected',
        registration
    });
});

// @desc    Check if user is registered for a specific event
// @route   GET /api/register/:eventId/status
// @access  Private
const checkRegistrationStatus = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    const registration = await Registration.findOne({ user: userId, event: eventId });

    res.json({
        isRegistered: !!registration,
        registration: registration ? {
            id: registration._id,
            status: registration.status,
            registrationDate: registration.registrationDate,
            customFormResponses: registration.customFormResponses
        } : null
    });
});

// @desc    Check if any registrations exist for an event
// @route   GET /api/register/event/:id/has-registrations
// @access  Private/Organizer
const checkEventHasRegistrations = asyncHandler(async (req, res) => {
    const { id: eventId } = req.params;

    // Verify user is the organizer of this event
    const event = await Event.findById(eventId);
    if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }

    if (event.organizerId.toString() !== req.user.id) {
        const err = new Error('Not authorized. Only the event organizer can check registrations.');
        err.status = 403;
        throw err;
    }

    // Check if any registrations exist for this event
    const registrationCount = await Registration.countDocuments({ event: eventId });

    res.json({
        hasRegistrations: registrationCount > 0,
        registrationCount: registrationCount
    });
});

module.exports = {
    registerEvent,
    getMyTickets,
    uploadPaymentProof,
    getPendingApprovals,
    approvePayment,
    checkRegistrationStatus,
    checkEventHasRegistrations
};
