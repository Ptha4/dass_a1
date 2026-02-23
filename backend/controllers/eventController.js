const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User'); // Assuming User model is needed for organizer role check

// @desc    Get organizer's events analytics
// @route   GET /api/events/analytics
// @access  Private/Organizer
const getEventAnalytics = asyncHandler(async (req, res) => {
    console.log('=== BACKEND ANALYTICS DEBUG ===');
    console.log('User:', req.user);
    console.log('Is Organizer:', req.user.isOrganiser);
    
    if (!req.user.isOrganiser) {
        console.log('Access denied: User is not an organizer');
        const err = new Error('Not authorized. Only organizers can access analytics.');
        err.status = 403;
        throw err;
    }

    const organizerId = req.user.id;
    console.log('Organizer ID:', organizerId);

    try {
        // Get all events for this organizer
        const events = await Event.find({ organizerId });
        console.log('Found events:', events.length);
        
        // Calculate analytics
        const analytics = {
            totalEvents: events.length,
            draftEvents: events.filter(e => e.status === 'draft').length,
            publishedEvents: events.filter(e => e.status === 'published').length,
            ongoingEvents: events.filter(e => e.status === 'ongoing').length,
            completedEvents: events.filter(e => e.status === 'completed').length,
            closedEvents: events.filter(e => e.status === 'closed').length,
            totalRegistrations: 0,
            totalRevenue: 0,
            merchSales: 0,
            normalEventRegistrations: 0
        };

        console.log('Initial analytics:', analytics);

        // Get registration data for all events
        const eventIds = events.map(e => e._id);
        console.log('Event IDs for registration lookup:', eventIds);
        
        const registrations = await Registration.find({ 
            event: { $in: eventIds },
            status: 'confirmed'
        }).populate('event');
        
        console.log('Found registrations:', registrations.length);

        // Calculate registration and revenue stats
        registrations.forEach(reg => {
            analytics.totalRegistrations++;
            
            if (reg.event.eventType === 'merch') {
                // Calculate merch revenue
                if (reg.purchasedItems && reg.purchasedItems.length > 0) {
                    reg.purchasedItems.forEach(item => {
                        analytics.merchSales += (item.quantity * item.price);
                    });
                }
            } else {
                // Calculate normal event revenue
                analytics.normalEventRegistrations++;
                if (reg.event.registrationFee) {
                    analytics.totalRevenue += reg.event.registrationFee;
                }
            }
        });

        // Add merch sales to total revenue
        analytics.totalRevenue += analytics.merchSales;

        console.log('Final analytics:', analytics);

        // Get recent events with stats
        const recentEvents = await Event.find({ organizerId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate({
                path: 'registrations',
                match: { status: 'confirmed' },
                select: '_id',
                strictPopulate: false // Disable strict populate check
            });

        console.log('Recent events found:', recentEvents.length);

        const eventsWithStats = recentEvents.map(event => ({
            _id: event._id,
            eventName: event.eventName,
            eventType: event.eventType,
            status: event.status,
            eventStartDate: event.eventStartDate,
            eventEndDate: event.eventEndDate,
            registrationCount: event.registrations ? event.registrations.length : 0,
            registrationLimit: event.registrationLimit,
            registrationFee: event.registrationFee,
            createdAt: event.createdAt
        }));

        const responseData = {
            summary: analytics,
            recentEvents: eventsWithStats
        };

        console.log('Sending analytics response:', responseData);
        console.log('=== END BACKEND ANALYTICS DEBUG ===');
        
        res.json(responseData);
    } catch (error) {
        console.error('Analytics calculation error:', error);
        throw error;
    }
});

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
            if (!item.itemName || typeof item.itemName !== 'string' ||
                item.stockQuantity === undefined || typeof item.stockQuantity !== 'number' || item.stockQuantity < 0 ||
                item.price === undefined || isNaN(Number(item.price)) || Number(item.price) < 0) {
                const err = new Error('Each item in a merch event must have a valid itemName (string), a non-negative stockQuantity (number), and a non-negative price (number).');
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
        // For merch events, registration fee is not used
        registrationFee: eventType === 'merch' ? undefined : (registrationFee ? Number(registrationFee) : undefined),
        organizerId: req.user.id,
        eventTags: Array.isArray(eventTags) ? eventTags : (eventTags ? String(eventTags).split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
        registrationForm: registrationForm || [],
        status: 'draft',
        items: eventType === 'merch'
            ? items.map((item) => ({
                ...item,
                stockQuantity: Number(item.stockQuantity),
                price: item.price !== undefined ? Number(item.price) : 0
            }))
            : [],
    });

    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
});

// Helper: escape special regex chars for partial matching
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all events (with optional search & filters)
// @route   GET /api/events?search=&eventType=&eligibility=&fromDate=&toDate=&followedOnly=
// @access  Public (optional auth for followedOnly)
const getEvents = asyncHandler(async (req, res) => {
    const { search, eventType, eligibility, fromDate, toDate, followedOnly, myDrafts, myEvents } = req.query;
    console.log('getEvents called with query:', req.query);
    console.log('User authenticated:', req.user ? 'Yes' : 'No');
    if (req.user) console.log('User ID:', req.user.id);
    
    const query = {};

    // Organiser's drafts only (requires auth)
    if (myDrafts === 'true' || myDrafts === true) {
        console.log('Fetching myDrafts');
        if (req.user && req.user.id) {
            query.organizerId = req.user.id;
            query.status = 'draft';
        }
    } else if (myEvents === 'true' || myEvents === true) {
        // Organiser's published events only (requires auth)
        console.log('Fetching myEvents for organizer:', req.user?.id);
        if (req.user && req.user.id) {
            query.organizerId = req.user.id;
            query.status = { $ne: 'draft' };
        }
    } else {
        console.log('Fetching public events');
        // Public browse: exclude drafts and archived events, and events from archived/disabled organizers
        query.status = { $ne: 'draft' };
        
        // Exclude events from archived or disabled organizers
        const excludedOrganizers = await User.find({
            $or: [
                { archived: true },
                { disabled: true }
            ]
        }).select('_id');
        
        const excludedOrganizerIds = excludedOrganizers.map(org => org._id);
        if (excludedOrganizerIds.length > 0) {
            query.organizerId = { $nin: excludedOrganizerIds };
        }
    }

    // Search: partial (regex) match on event name or organizer name
    if (search && String(search).trim()) {
        const term = escapeRegex(String(search).trim());
        const regex = new RegExp(term, 'i');
        const organizerIds = await User.find({
            isOrganiser: true,
            archived: { $ne: true },
            disabled: { $ne: true },
            $or: [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
            ],
        })
            .select('_id')
            .lean();
        const ids = organizerIds.map((o) => o._id);
        query.$or = [
            { eventName: regex },
            { organizerId: { $in: ids } },
        ];
    }

    if (eventType && String(eventType).trim()) {
        query.eventType = String(eventType).trim();
    }

    if (eligibility && String(eligibility).trim()) {
        query.eligibility = String(eligibility).trim();
    }

    // Date range: event overlaps [fromDate, toDate]
    if (fromDate || toDate) {
        query.$and = query.$and || [];
        if (fromDate) {
            query.$and.push({ eventEndDate: { $gte: new Date(fromDate) } });
        }
        if (toDate) {
            query.$and.push({ eventStartDate: { $lte: new Date(toDate) } });
        }
    }

    // Followed clubs only (requires auth)
    if (followedOnly === 'true' || followedOnly === true) {
        if (req.user && req.user.id) {
            const user = await User.findById(req.user.id).select('followedClubs').lean();
            const clubIds = (user && user.followedClubs) || [];
            if (clubIds.length > 0) {
                // Only include clubs that are not archived or disabled
                const validClubs = await User.find({
                    _id: { $in: clubIds },
                    archived: { $ne: true },
                    disabled: { $ne: true }
                }).select('_id').lean();
                
                const validClubIds = validClubs.map(club => club._id);
                if (validClubIds.length > 0) {
                    query.organizerId = { $in: validClubIds };
                } else {
                    query.organizerId = { $in: [] };
                }
            } else {
                query.organizerId = { $in: [] };
            }
        }
    }

    // Filter by single organizer (e.g. for organizer detail page)
    if (req.query.organizerId && String(req.query.organizerId).trim()) {
        query.organizerId = req.query.organizerId.trim();
    }

    const events = await Event.find(query).populate('organizerId', 'firstName lastName email');
    res.json(events);
});

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).populate('organizerId', 'firstName lastName email');

    if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }

    // Check if event or organizer is archived/disabled
    if (event.status === 'archived') {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }

    if (event.organizerId && (event.organizerId.archived || event.organizerId.disabled)) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }

    let remainingRegistrations = null;
    if (event.eventType !== 'merch' && event.registrationLimit) {
        const currentCount = await Registration.countDocuments({ event: event._id, status: 'confirmed' });
        remainingRegistrations = Math.max(0, event.registrationLimit - currentCount);
    }

    const eventObj = event.toObject();
    eventObj.remainingRegistrations = remainingRegistrations;

    res.json(eventObj);
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
                if (!item.itemName || typeof item.itemName !== 'string' ||
                    item.stockQuantity === undefined || typeof item.stockQuantity !== 'number' || item.stockQuantity < 0 ||
                    item.price === undefined || isNaN(Number(item.price)) || Number(item.price) < 0) {
                    const err = new Error('Each item in a merch event must have a valid itemName (string), a non-negative stockQuantity (number), and a non-negative price (number).');
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
            // For merch events, registration fee is not used
            event.registrationFee = eventType === 'merch'
                ? undefined
                : (registrationFee || event.registrationFee);
            event.eventTags = eventTags || event.eventTags;
            event.registrationForm = registrationForm || event.registrationForm;
            event.items = items
                ? items.map((item) => ({
                    ...item,
                    stockQuantity: Number(item.stockQuantity),
                    price: item.price !== undefined ? Number(item.price) : 0
                }))
                : event.items;
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
    updateEventStatus,
    getEventAnalytics
};