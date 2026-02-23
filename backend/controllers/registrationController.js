const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid'); // For unique ticket IDs
const QRCode = require('qrcode'); // For QR code generation
const nodemailer = require('nodemailer'); // For sending emails

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User'); // To populate user details for ticket

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

// Helper function to send email
const sendEmail = async (to, subject, htmlContent) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html: htmlContent,
        });
        console.log(`Email sent to ${to}`);
    } catch (err) {
        console.error('Error sending email:', err);
        // In a real application, you might want to log this error and potentially retry
    }
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

        // Calculate current quantities purchased by this user
        const currentPurchases = {};
        let totalItemsPurchased = 0;

        existingRegistrations.forEach(reg => {
            if (reg.purchasedItems && Array.isArray(reg.purchasedItems)) {
                reg.purchasedItems.forEach(purchasedItem => {
                    const itemName = purchasedItem.item.itemName;
                    currentPurchases[itemName] = (currentPurchases[itemName] || 0) + purchasedItem.quantity;
                    totalItemsPurchased += purchasedItem.quantity;
                });
            }
        });

        console.log('Purchase limit check:', {
            currentPurchases,
            totalItemsPurchased,
            eventLimit: event.purchaseLimitPerParticipant
        });

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

        // Check event-level purchase limit
        const newTotalItems = totalItemsPurchased + purchasedItems.reduce((sum, item) => sum + item.quantity, 0);
        if (event.purchaseLimitPerParticipant > 0 && newTotalItems > event.purchaseLimitPerParticipant) {
            const err = new Error(`Event purchase limit exceeded. You can purchase maximum ${event.purchaseLimitPerParticipant} items total for this event. You already have ${totalItemsPurchased} items and are trying to add ${purchasedItems.reduce((sum, item) => sum + item.quantity, 0)} more.`);
            err.status = 400;
            throw err;
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

        // Send confirmation email with ticket (commented out for now)
        // const emailHtml = `
        //     <h1>Event Registration Confirmation & Ticket</h1>
        //     <p>Dear ${userDetails.firstName} ${userDetails.lastName},</p>
        //     <p>Thank you for registering for ${event.eventName}!</p>
        //     <p><strong>Event:</strong> ${event.eventName}</p>
        //     <p><strong>Date:</strong> ${event.eventStartDate.toDateString()}</p>
        //     <p><strong>Location:</strong> ${event.location}</p>
        //     <p><strong>Ticket ID:</strong> ${ticketId}</p>
        //     <p>Please find your QR code ticket attached or embedded below:</p>
        //     <img src="${qrCodeDataURL}" alt="QR Code Ticket" />
        //     <p>We look forward to seeing you!</p>
        // `;
        // await sendEmail(userDetails.email, `Your Ticket for ${event.eventName}`, emailHtml);
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
const uploadPaymentProof = asyncHandler(async (req, res) => {
    const registrationId = req.params.registrationId;
    
    console.log('=== UPLOAD PAYMENT PROOF CONTROLLER ===');
    console.log('registrationId:', registrationId);
    console.log('req.file:', req.file);
    console.log('req.user.id:', req.user?.id);
    
    if (!req.file) {
        res.status(400);
        throw new Error('No payment proof image uploaded');
    }

    const registration = await Registration.findById(registrationId)
        .populate('event');

    console.log('Found registration:', registration);

    if (!registration) {
        res.status(404);
        throw new Error('Registration not found');
    }

    // Check if registration belongs to the user
    if (registration.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to upload payment proof for this registration');
    }

    // Check if this is a merch event
    if (registration.event.eventType !== 'merch') {
        res.status(400);
        throw new Error('Payment proof is only required for merchandise events');
    }

    // Check if payment proof has already been uploaded
    if (registration.paymentProof?.proofImage) {
        console.log('Payment proof already exists');
        res.status(400);
        throw new Error('Payment proof has already been uploaded');
    }

    // Update registration with payment proof
    registration.paymentProof = {
        proofImage: `/uploads/payment-proofs/${req.file.filename}`,
        uploadedAt: new Date()
    };
    
    console.log('Updating registration with payment proof:', registration.paymentProof);
    
    registration.status = 'payment_pending';
    await registration.save();

    console.log('Registration saved successfully');

    res.json({
        message: 'Payment proof uploaded successfully. Waiting for approval.',
        registration
    });
});

// @desc    Get all pending payment approvals for organizer
// @route   GET /api/register/pending-approvals
// @access  Private/Organizer
const getPendingApprovals = asyncHandler(async (req, res) => {
    if (!req.user.isOrganiser) {
        res.status(403);
        throw new Error('Not authorized. Only organizers can view pending approvals');
    }

    // Get all registrations for this organizer's events that have payment pending
    const registrations = await Registration.find({
        status: 'payment_pending',
        'paymentProof.proofImage': { $exists: true }
    })
    .populate({
        path: 'event',
        match: { organizerId: req.user.id },
        select: 'eventName eventType'
    })
    .populate('user', 'firstName lastName email')
    .sort({ 'paymentProof.uploadedAt': -1 });

    // Filter out registrations where event doesn't belong to this organizer
    const filteredRegistrations = registrations.filter(reg => reg.event !== null);

    res.json(filteredRegistrations);
});

// @desc    Approve or reject payment
// @route   PATCH /api/register/:registrationId/approve-payment
// @access  Private/Organizer
const approvePayment = asyncHandler(async (req, res) => {
    const registrationId = req.params.registrationId;
    const { approved, rejectionReason } = req.body;

    if (typeof approved !== 'boolean') {
        res.status(400);
        throw new Error('Approved status must be true or false');
    }

    const registration = await Registration.findById(registrationId)
        .populate('event')
        .populate('user');

    if (!registration) {
        res.status(404);
        throw new Error('Registration not found');
    }

    // Check if registration belongs to organizer's event
    if (registration.event.organizerId.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to approve payment for this registration');
    }

    // Check if payment is still pending
    if (registration.status !== 'payment_pending') {
        res.status(400);
        throw new Error('Payment has already been processed');
    }

    if (approved) {
        // Approve payment
        registration.status = 'payment_approved';
        registration.paymentProof.approvedAt = new Date();
        registration.paymentProof.approvedBy = req.user.id;
        registration.paymentProof.rejectionReason = undefined;

        // Decrement stock for each purchased item
        for (const purchasedItem of registration.purchasedItems) {
            const eventItem = registration.event.items.find(
                item => item.itemName === purchasedItem.item.itemName
            );
            
            if (eventItem) {
                eventItem.stockQuantity -= purchasedItem.quantity;
                if (eventItem.stockQuantity < 0) {
                    eventItem.stockQuantity = 0;
                }
            }
        }
        
        await registration.event.save();

        // Generate ticket and QR code
        const ticketId = `TICKET-${uuidv4()}`;
        const userDetails = await User.findById(registration.user._id);
        
        const qrCodeContent = {
            ticketId,
            eventId: registration.event._id,
            eventType: registration.event.eventType,
            purchasedItems: registration.purchasedItems.map(item => ({ 
                name: item.item.itemName, 
                qty: item.quantity 
            }))
        };
        
        const qrCodeDataURL = await generateQrCodeDataURL(qrCodeContent);

        const ticket = new Ticket({
            registration: registration._id,
            event: registration.event._id,
            user: registration.user._id,
            ticketId,
            qrCodeData: qrCodeDataURL,
            eventName: registration.event.eventName,
            eventDate: registration.event.eventStartDate,
            eventLocation: registration.event.location,
            participantName: `${userDetails.firstName} ${userDetails.lastName}`,
            participantEmail: userDetails.email,
            purchasedItemsDetails: registration.purchasedItems.map(item => ({ 
                itemName: item.item.itemName, 
                quantity: item.quantity 
            }))
        });
        
        await ticket.save();
        registration.ticket = ticket._id;

        // Send confirmation email
        const emailSubject = `Payment Approved - ${registration.event.eventName}`;
        const emailContent = `
            <h2>Payment Approved! 🎉</h2>
            <p>Dear ${userDetails.firstName},</p>
            <p>Your payment for <strong>${registration.event.eventName}</strong> has been approved.</p>
            <p>Your ticket ID: <strong>${ticketId}</strong></p>
            <p>You can now access your ticket with the QR code in your dashboard.</p>
            <p>Thank you for your purchase!</p>
        `;
        
        await sendEmail(userDetails.email, emailSubject, emailContent);

    } else {
        // Reject payment
        registration.status = 'payment_rejected';
        registration.paymentProof.rejectedAt = new Date();
        registration.paymentProof.rejectionReason = rejectionReason || 'Payment proof could not be verified';
        registration.paymentProof.approvedAt = undefined;
        registration.paymentProof.approvedBy = undefined;

        // Send rejection email
        const userDetails = await User.findById(registration.user._id);
        const emailSubject = `Payment Rejected - ${registration.event.eventName}`;
        const emailContent = `
            <h2>Payment Rejected</h2>
            <p>Dear ${userDetails.firstName},</p>
            <p>Your payment proof for <strong>${registration.event.eventName}</strong> has been rejected.</p>
            <p>Reason: ${registration.paymentProof.rejectionReason}</p>
            <p>Please upload a valid payment proof or contact the event organizer for assistance.</p>
        `;
        
        await sendEmail(userDetails.email, emailSubject, emailContent);
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

module.exports = {
    registerEvent,
    getMyTickets,
    uploadPaymentProof,
    getPendingApprovals,
    approvePayment,
    checkRegistrationStatus
};
