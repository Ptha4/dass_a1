const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
    verifyForumAccess, 
    verifyOrganizerAccess, 
    verifyDeleteAccess, 
    verifyPinAccess, 
    verifyAnnouncementAccess 
} = require('../middleware/forumAccess');
const {
    getEventMessages,
    getMessageThread,
    createMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    markAnnouncement,
    getPinnedMessages,
    getAnnouncements,
    addReaction,
    searchMessages,
    checkForumAccess
} = require('../controllers/forumController');

// Forum access check (for UI: show forum only to registered/organizer)
router.get('/access/:eventId', protect, verifyForumAccess, checkForumAccess);

// Message CRUD operations
router.get('/messages/:eventId', protect, verifyForumAccess, getEventMessages);
router.get('/messages/:eventId/pinned', protect, verifyForumAccess, getPinnedMessages);
router.get('/messages/:eventId/announcements', protect, verifyForumAccess, getAnnouncements);
router.get('/messages/:eventId/search', protect, verifyForumAccess, searchMessages);
router.get('/thread/:messageId', protect, getMessageThread);
router.post('/messages', protect, verifyForumAccess, createMessage);
router.put('/messages/:messageId', protect, verifyForumAccess, editMessage);
router.delete('/messages/:messageId', protect, verifyDeleteAccess, deleteMessage);

// Reaction operations
router.post('/messages/:messageId/reaction', protect, verifyForumAccess, addReaction);

// Organizer-only operations
router.patch('/messages/:messageId/pin', protect, verifyPinAccess, pinMessage);
router.patch('/messages/:messageId/announcement', protect, verifyAnnouncementAccess, markAnnouncement);

module.exports = router;
