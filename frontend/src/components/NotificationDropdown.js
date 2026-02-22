import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import notificationService from '../services/notificationService';
import socketService from '../services/socketService';

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Load notifications and unread count
    const loadNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationService.getNotifications(1, 10);
            setNotifications(response.notifications);
            setUnreadCount(response.unreadCount);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load unread count only
    const loadUnreadCount = async () => {
        try {
            const response = await notificationService.getUnreadCount();
            setUnreadCount(response.count);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    };

    // Mark notifications as read
    const markAsRead = async (notificationIds = null) => {
        try {
            await notificationService.markNotificationsRead(notificationIds);
            await loadUnreadCount();
            
            // Update local notifications
            if (notificationIds) {
                setNotifications(prev => prev.map(notif => 
                    notificationIds.includes(notif._id) 
                        ? { ...notif, isRead: true }
                        : notif
                ));
            } else {
                setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
            }
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId) => {
        try {
            await notificationService.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            await loadUnreadCount();
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    // Clear all notifications
    const clearAll = async () => {
        try {
            await notificationService.clearAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'NEW_MESSAGE':
                return '💬';
            case 'REPLY':
                return '↩️';
            case 'ANNOUNCEMENT':
                return '📢';
            case 'MESSAGE_PINNED':
                return '📌';
            default:
                return '🔔';
        }
    };

    // Get notification text based on type
    const getNotificationText = (notification) => {
        const { senderName, type } = notification;
        
        switch (type) {
            case 'NEW_MESSAGE':
                return `${senderName} posted a message`;
            case 'REPLY':
                return `${senderName} replied to your message`;
            case 'ANNOUNCEMENT':
                return `${senderName} posted an announcement`;
            case 'MESSAGE_PINNED':
                return `${senderName} pinned a message`;
            default:
                return `${senderName} sent a notification`;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load initial data
    useEffect(() => {
        loadUnreadCount();
    }, []);

    // Setup socket listeners
    useEffect(() => {
        // Listen for new notifications
        socketService.on('new-notification', (notification) => {
            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            setUnreadCount(prev => prev + 1);
        });

        // Listen for notification count updates
        socketService.on('notification-count', (data) => {
            setUnreadCount(data.count);
        });

        return () => {
            socketService.off('new-notification');
            socketService.off('notification-count');
        };
    }, []);

    // Load notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                
                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <div className="flex space-x-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAsRead()}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={`p-4 hover:bg-gray-50 cursor-pointer ${
                                            !notification.isRead ? 'bg-blue-50' : ''
                                        }`}
                                        onClick={() => markAsRead([notification._id])}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 text-2xl">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {getNotificationText(notification)}
                                                </p>
                                                {notification.messagePreview && (
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {notification.messagePreview}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification._id);
                                                }}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-200 text-center">
                            <button className="text-sm text-blue-600 hover:text-blue-800">
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
