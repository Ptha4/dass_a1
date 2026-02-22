import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get auth token
const getAuthConfig = () => {
    const token = authService.getToken();
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

class NotificationService {
    // Get user's notifications
    async getNotifications(page = 1, limit = 20, unreadOnly = false) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        
        if (unreadOnly) {
            params.append('unreadOnly', 'true');
        }

        const response = await axios.get(
            `${API_URL}/notifications?${params}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Get unread notification count
    async getUnreadCount() {
        const response = await axios.get(
            `${API_URL}/notifications/unread-count`,
            getAuthConfig()
        );
        return response.data;
    }

    // Mark notifications as read
    async markNotificationsRead(notificationIds = null) {
        const response = await axios.patch(
            `${API_URL}/notifications/mark-read`,
            { notificationIds },
            getAuthConfig()
        );
        return response.data;
    }

    // Mark all notifications as read
    async markAllNotificationsRead() {
        const response = await axios.patch(
            `${API_URL}/notifications/mark-all-read`,
            {},
            getAuthConfig()
        );
        return response.data;
    }

    // Delete notification
    async deleteNotification(notificationId) {
        const response = await axios.delete(
            `${API_URL}/notifications/${notificationId}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Clear all notifications
    async clearAllNotifications() {
        const response = await axios.delete(
            `${API_URL}/notifications/clear-all`,
            getAuthConfig()
        );
        return response.data;
    }

    // Get notifications by event
    async getEventNotifications(eventId, page = 1, limit = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });

        const response = await axios.get(
            `${API_URL}/notifications/event/${eventId}?${params}`,
            getAuthConfig()
        );
        return response.data;
    }

    // Get notification settings
    async getNotificationSettings() {
        const response = await axios.get(
            `${API_URL}/notifications/settings`,
            getAuthConfig()
        );
        return response.data;
    }

    // Update notification settings
    async updateNotificationSettings(settings) {
        const response = await axios.patch(
            `${API_URL}/notifications/settings`,
            settings,
            getAuthConfig()
        );
        return response.data;
    }

    // Get notification statistics
    async getNotificationStats() {
        const response = await axios.get(
            `${API_URL}/notifications/stats`,
            getAuthConfig()
        );
        return response.data;
    }
}

const notificationService = new NotificationService();
export default notificationService;
