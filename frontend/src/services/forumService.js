import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get auth config (backend expects x-auth-token)
const getAuthConfig = () => {
    const token = authService.getToken();
    return {
        headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
        }
    };
};

class ForumService {
    // Check if current user has forum access (organizer or registered for event)
    async checkForumAccess(eventId) {
        const response = await axios.get(
            `${API_URL}/forum/access/${eventId}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Get all messages for an event
    async getEventMessages(eventId, page = 1, limit = 50, parentMessageId = null) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        
        if (parentMessageId) {
            params.append('parentMessageId', parentMessageId);
        }

        const response = await axios.get(
            `${API_URL}/forum/messages/${eventId}?${params}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Get message thread (replies)
    async getMessageThread(messageId) {
        const response = await axios.get(
            `${API_URL}/forum/thread/${messageId}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Create a new message
    async createMessage(eventId, content, parentMessageId = null) {
        const response = await axios.post(
            `${API_URL}/forum/messages`,
            { eventId, content, parentMessageId },
            getAuthConfig()
        );
        return response.data;
    }

    // Edit a message
    async editMessage(messageId, content) {
        const response = await axios.put(
            `${API_URL}/forum/messages/${messageId}`,
            { content },
            getAuthConfig()
        );
        return response.data;
    }

    // Delete a message
    async deleteMessage(messageId) {
        const response = await axios.delete(
            `${API_URL}/forum/messages/${messageId}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Pin/unpin a message
    async pinMessage(messageId, isPinned) {
        const response = await axios.patch(
            `${API_URL}/forum/messages/${messageId}/pin`,
            { isPinned },
            getAuthConfig()
        );
        return response.data;
    }

    // Mark/unmark message as announcement
    async markAnnouncement(messageId, isAnnouncement) {
        const response = await axios.patch(
            `${API_URL}/forum/messages/${messageId}/announcement`,
            { isAnnouncement },
            getAuthConfig()
        );
        return response.data;
    }

    // Get pinned messages for an event
    async getPinnedMessages(eventId) {
        const response = await axios.get(
            `${API_URL}/forum/messages/${eventId}/pinned`,
            getAuthConfig()
        );
        return response.data;
    }

    // Get announcements for an event
    async getAnnouncements(eventId) {
        const response = await axios.get(
            `${API_URL}/forum/messages/${eventId}/announcements`,
            getAuthConfig()
        );
        return response.data;
    }

    // Add or remove reaction to a message
    async addReaction(messageId, emoji) {
        const response = await axios.post(
            `${API_URL}/forum/messages/${messageId}/reaction`,
            { emoji },
            getAuthConfig()
        );
        return response.data;
    }

    // Search messages in an event
    async searchMessages(eventId, query, page = 1, limit = 20) {
        const params = new URLSearchParams({
            q: query,
            page: page.toString(),
            limit: limit.toString()
        });

        const response = await axios.get(
            `${API_URL}/forum/messages/${eventId}/search?${params}`,
            getAuthConfig()
        );
        return response.data;
    }
}

const forumService = new ForumService();
export default forumService;
