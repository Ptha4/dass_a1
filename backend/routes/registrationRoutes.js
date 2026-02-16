const express = require('express');
const router = express.Router();
const { registerEvent, getMyTickets } = require('../controllers/registrationController');
const { protect } = require('../middleware/auth'); // Assuming you have an auth middleware

router.post('/:eventId', protect, registerEvent);
router.get('/my-tickets', protect, getMyTickets);

module.exports = router;
