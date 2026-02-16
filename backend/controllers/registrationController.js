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
            // Assuming a price per item for total cost calculation, if applicable
            // totalCost += itemPurchase.quantity * eventItem.price;
        }

        // Save updated event with decremented stock
        event.items = updatedEventItems;
        await event.save();

        registration = new Registration({
            user: req.user.id,
            event: eventId,
            purchasedItems: itemsToPurchase,
            status: 'confirmed'
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

module.exports = {
    registerEvent,
    getMyTickets
};
