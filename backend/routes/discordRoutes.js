const express = require('express');
const { testDiscordWebhook, getDiscordStatus } = require('../controllers/discordController');
const { protect, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Test Discord webhook connection
router.post('/test', protect, requireAdmin, testDiscordWebhook);

// Get Discord webhook configuration status
router.get('/status', protect, requireAdmin, getDiscordStatus);

module.exports = router;
