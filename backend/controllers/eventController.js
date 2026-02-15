const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const User = require('../models/User'); // Assuming User model is needed for organizer role check

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Organizer
const createEvent = asyncHandler(async (req, res) => {
    const {
        eventName,
        eventDescription,
        eventType,
        eligibility,
        location,
        registrationDeadline,
        eventStartDate,
        eventEndDate,
        registrationLimit,
        registrationFee,
        eventTags,
        registrationForm,
        items
    } = req.body;

    // Input Validation
    if (!eventName || !eventDescription || !registrationDeadline || !eventStartDate || !eventEndDate) {
        const err = new Error('Please fill in all required event fields: Event Name, Description, Registration Deadline, Start Date, and End Date.');
        err.status = 400;
        throw err;
    }

    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);
    const deadline = new Date(registrationDeadline);

    if (start > end) {
        const err = new Error('Event End Date cannot be before Event Start Date.');
        err.status = 400;
        throw err;
    }
    if (deadline > start) {
        const err = new Error('Registration Deadline cannot be after Event Start Date.');
        err.status = 400;
        throw err;
    }

    if (registrationLimit !== undefined && isNaN(Number(registrationLimit))) {
        const err = new Error('Registration Limit must be a valid number.');
        err.status = 400;
        throw err;
    }

    if (registrationFee !== undefined && isNaN(Number(registrationFee))) {
        const err = new Error('Registration Fee must be a valid number.');
        err.status = 400;
        throw err;
    }

    // Validate items for merch events
    if (eventType === 'merch') {
        if (!items || !Array.isArray(items) || items.length === 0) {
            const err = new Error('Merch events must include at least one item with itemName and stockQuantity.');
            err.status = 400;
            throw err;
        }
        for (const item of items) {
            if (!item.itemName || typeof item.itemName !== 'string' || !item.stockQuantity || typeof item.stockQuantity !== 'number' || item.stockQuantity < 0) {
                const err = new Error('Each item in a merch event must have a valid itemName (string) and a non-negative stockQuantity (number).');
                err.status = 400;
                throw err;
            }
        }
    }

    // Check if user is an organizer (JWT payload uses isOrganiser, not role)
    if (!req.user.isOrganiser) {
        const err = new Error('Not authorized to create an event. Only organizers can create events.');
        err.status = 403;
        throw err;
    }

    const event = new Event({
        eventName,
        eventDescription,
        eventType,
        eligibility,
        location: location || 'TBD',
        registrationDeadline,
        eventStartDate,
        eventEndDate,
        registrationLimit: registrationLimit ? Number(registrationLimit) : undefined,
        registrationFee: registrationFee ? Number(registrationFee) : undefined,
        organizerId: req.user.id,
        eventTags: Array.isArray(eventTags) ? eventTags : (eventTags ? String(eventTags).split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
        registrationForm: registrationForm || [],
        status: 'draft',
        items: eventType === 'merch' ? items : [],
    });

    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
});

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req, res) => {
    const events = await Event.find({}).populate('organizerId', 'firstName lastName email');
    res.json(events);
});

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).populate('organizerId', 'firstName lastName email');

    if (event) {
        res.json(event);
    } else {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Organizer
const updateEvent = asyncHandler(async (req, res) => {
    const {
        eventName,
        eventDescription,
        eventType,
        eligibility,
        location,
        registrationDeadline,
        eventStartDate,
        eventEndDate,
        registrationLimit,
        registrationFee,
        eventTags,
        status,
        registrationForm,
        items
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (event) {
        // Check if user is the organizer of the event
        if (event.organizerId.toString() !== req.user.id.toString()) {
            const err = new Error('Not authorized to update this event');
            err.status = 403;
            throw err;
        }

        // Validate items for merch events if provided in the update
        if (eventType === 'merch' && items) {
            if (!Array.isArray(items) || items.length === 0) {
                const err = new Error('Merch events must include at least one item with itemName and stockQuantity.');
                err.status = 400;
                throw err;
            }
            for (const item of items) {
                if (!item.itemName || typeof item.itemName !== 'string' || !item.stockQuantity || typeof item.stockQuantity !== 'number' || item.stockQuantity < 0) {
                    const err = new Error('Each item in a merch event must have a valid itemName (string) and a non-negative stockQuantity (number).');
                    err.status = 400;
                    throw err;
                }
            }
        }


        // Event flow logic
        if (event.status === 'published') {
            // Only description, deadline, limit can be updated
            event.eventDescription = eventDescription || event.eventDescription;
            event.registrationDeadline = registrationDeadline || event.registrationDeadline;
            event.registrationLimit = registrationLimit || event.registrationLimit;
            // If registrationForm is provided, check if registrations have started
            if (registrationForm && event.registrationForm.length > 0) {
                // This is a placeholder for checking if registrations have started.
                // In a real application, you'd have a 'registrations' collection
                // and check if any registrations exist for this event.
                // For now, we'll assume if the form is already defined, it's locked.
                res.status(400);
                throw new Error('Registration form is locked after first registration.');
            } else if (registrationForm) {
                event.registrationForm = registrationForm;
            }
        } else if (event.status === 'draft') {
            // Free edits in draft stage
            event.eventName = eventName || event.eventName;
            event.eventDescription = eventDescription || event.eventDescription;
            event.eventType = eventType || event.eventType;
            event.eligibility = eligibility || event.eligibility;
            event.location = location || event.location;
            event.registrationDeadline = registrationDeadline || event.registrationDeadline;
            event.eventStartDate = eventStartDate || event.eventStartDate;
            event.eventEndDate = eventEndDate || event.eventEndDate;
            event.registrationLimit = registrationLimit || event.registrationLimit;
            event.registrationFee = registrationFee || event.registrationFee;
            event.eventTags = eventTags || event.eventTags;
            event.registrationForm = registrationForm || event.registrationForm;
            event.items = items || event.items;
        } else if (event.status === 'ongoing' || event.status === 'completed' || event.status === 'closed') {
            res.status(400);
            throw new Error('Cannot edit event details in ongoing, completed, or closed status.');
        }

        // Allow status change if explicitly provided and valid
        if (status && ['published', 'ongoing', 'completed', 'closed'].includes(status)) {
            // Add more specific status transition logic here if needed
            event.status = status;
        }

        const updatedEvent = await event.save();
        res.json(updatedEvent);
    } else {
        res.status(404);
        throw new Error('Event not found');
    }
});

// @desc    Update event status (e.g., publish, close, complete)
// @route   PUT /api/events/:id/status
// @access  Private/Organizer
const updateEventStatus = asyncHandler(async (req, res) => {
    const {
        status
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (event) {
        // Check if user is the organizer of the event
        if (event.organizerId.toString() !== req.user.id.toString()) {
            const err = new Error('Not authorized to update this event status');
            err.status = 403;
            throw err;
        }

        // Implement status transition logic
        if (status && ['published', 'ongoing', 'completed', 'closed'].includes(status)) {
            // Example transitions:
            // Draft -> Published
            // Published -> Ongoing (can be automatic based on date)
            // Published/Ongoing -> Completed/Closed
            event.status = status;
            const updatedEvent = await event.save();
            res.json(updatedEvent);
        } else {
            const err = new Error('Invalid status provided');
            err.status = 400;
            throw err;
        }
    } else {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }
});


module.exports = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    updateEventStatus
};