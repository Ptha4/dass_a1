const express = require('express');
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    updateEventStatus,
    getEventAnalytics
} = require('../controllers/eventController');
const { protect, optionalProtect } = require('../middleware/auth');
const router = express.Router();

router.route('/')
    .post(protect, createEvent) // Only authenticated organizers can create events
    .get(optionalProtect, getEvents);

router.route('/analytics')
    .get(protect, getEventAnalytics); // Only authenticated organizers can access analytics

router.route('/:id')
    .get(getEventById) // Anyone can view a single event
    .put(protect, updateEvent); // Only authenticated organizers can update their events

router.route('/:id/status')
    .put(protect, updateEventStatus); // Only authenticated organizers can update their event status

module.exports = router;