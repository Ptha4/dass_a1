const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getEventMessages,
    getMessageThread,
    createMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    markAnnouncement,
    addReaction,
    getPinnedMessages,
    getAnnouncements,
    searchMessages
} = require('../controllers/forumController');

// Message CRUD operations
router.get('/messages/:eventId', protect, getEventMessages);
router.get('/messages/:eventId/pinned', protect, getPinnedMessages);
router.get('/messages/:eventId/announcements', protect, getAnnouncements);
router.get('/messages/:eventId/search', protect, searchMessages);
router.get('/thread/:messageId', protect, getMessageThread);
router.post('/messages', protect, createMessage);
router.put('/messages/:messageId', protect, editMessage);
router.delete('/messages/:messageId', protect, deleteMessage);

// Organizer-only operations
router.patch('/messages/:messageId/pin', protect, pinMessage);
router.patch('/messages/:messageId/announcement', protect, markAnnouncement);

// Reactions
router.post('/messages/:messageId/reactions', protect, addReaction);

module.exports = router;
