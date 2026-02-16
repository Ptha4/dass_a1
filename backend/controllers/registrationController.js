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
    const { purchasedItems } = req.body; // For merch events

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

            if (eventItem.stockQuantity < itemPurchase.quantity) {
                const err = new Error(`Not enough stock for ${eventItem.itemName}. Available: ${eventItem.stockQuantity}`);
                err.status = 400;
                throw err;
            }

            // Decrement stock
            updatedEventItems[eventItemIndex].stockQuantity -= itemPurchase.quantity;
            itemsToPurchase.push({
                item: {
                    itemName: eventItem.itemName,
                    stockQuantity: eventItem.stockQuantity + itemPurchase.quantity // Snapshot of original stock
                },
                quantity: itemPurchase.quantity
            });
            // Total cost = sum of quantity * price per item
            const price = Number(eventItem.price || 0);
            totalCost += itemPurchase.quantity * price;
        }

        // Save updated event with decremented stock
        event.items = updatedEventItems;
        await event.save();

        registration = new Registration({
            user: req.user.id,
            event: eventId,
            purchasedItems: itemsToPurchase,
            status: 'confirmed',
            totalCost
        });
        await registration.save();

        // Generate Ticket for Merch Event
        const ticketId = uuidv4();
        const qrCodeContent = {
            ticketId,
            userId: req.user.id,
            eventId: event._id,
            eventType: event.eventType,
            purchasedItems: itemsToPurchase.map(item => ({ name: item.item.itemName, qty: item.quantity }))
        };
        const qrCodeDataURL = await generateQrCodeDataURL(qrCodeContent);

        ticket = new Ticket({
            registration: registration._id,
            event: event._id,
            user: req.user.id,
            ticketId,
            qrCodeData: qrCodeDataURL,
            eventName: event.eventName,
            eventDate: event.eventStartDate, // Using eventStartDate for ticket
            eventLocation: event.location,
            participantName: `${userDetails.firstName} ${userDetails.lastName}`,
            participantEmail: userDetails.email,
            purchasedItemsDetails: itemsToPurchase.map(item => ({ itemName: item.item.itemName, quantity: item.quantity }))
        });
        await ticket.save();

        registration.ticket = ticket._id;
        await registration.save();

        // Send confirmation email with ticket
        const emailHtml = `
            <h1>Merchandise Purchase Confirmation & Event Ticket</h1>
            <p>Dear ${userDetails.firstName} ${userDetails.lastName},</p>
            <p>Thank you for your purchase and registration for ${event.eventName}!</p>
            <p><strong>Event:</strong> ${event.eventName}</p>
            <p><strong>Date:</strong> ${event.eventStartDate.toDateString()}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>Purchased Items:</strong></p>
            <ul>
                ${itemsToPurchase.map(item => `<li>${item.item.itemName} (x${item.quantity})</li>`).join('')}
            </ul>
            <p>Please find your QR code ticket attached or embedded below:</p>
            <img src="${qrCodeDataURL}" alt="QR Code Ticket" />
            <p>We look forward to seeing you!</p>
        `;
        await sendEmail(userDetails.email, `Your Merch Purchase & Ticket for ${event.eventName}`, emailHtml);

    } else { // Normal or Ticket Event
        registration = new Registration({
            user: req.user.id,
            event: eventId,
            status: 'confirmed'
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

        // Send confirmation email with ticket
        const emailHtml = `
            <h1>Event Registration Confirmation & Ticket</h1>
            <p>Dear ${userDetails.firstName} ${userDetails.lastName},</p>
            <p>Thank you for registering for ${event.eventName}!</p>
            <p><strong>Event:</strong> ${event.eventName}</p>
            <p><strong>Date:</strong> ${event.eventStartDate.toDateString()}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p>Please find your QR code ticket attached or embedded below:</p>
            <img src="${qrCodeDataURL}" alt="QR Code Ticket" />
            <p>We look forward to seeing you!</p>
        `;
        await sendEmail(userDetails.email, `Your Ticket for ${event.eventName}`, emailHtml);
    }

    res.status(201).json({ message: 'Registration successful and ticket sent!', registration, ticket });
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
    
    if (!req.file) {
        res.status(400);
        throw new Error('No payment proof image uploaded');
    }

    const registration = await Registration.findById(registrationId)
        .populate('event');

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
        res.status(400);
        throw new Error('Payment proof has already been uploaded');
    }

    // Update registration with payment proof
    registration.paymentProof = {
        proofImage: `/uploads/payment-proofs/${req.file.filename}`,
        uploadedAt: new Date()
    };
    
    registration.status = 'payment_pending';
    await registration.save();

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
    .populate('event', 'eventName eventType')
    .populate('user', 'firstName lastName email')
    .sort({ 'paymentProof.uploadedAt': -1 });

    res.json(registrations);
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
            event: registration.event.eventName,
            eventType: registration.event.eventType,
            purchasedItems: registration.purchasedItems.map(item => ({ 
                name: purchasedItem.item.itemName, 
                qty: purchasedItem.quantity 
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
                itemName: purchasedItem.item.itemName, 
                quantity: purchasedItem.quantity 
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

module.exports = {
    registerEvent,
    getMyTickets,
    uploadPaymentProof,
    getPendingApprovals,
    approvePayment
};
