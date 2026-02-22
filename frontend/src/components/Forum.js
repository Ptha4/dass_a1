import React, { useState, useEffect, useCallback } from 'react';
import forumService from '../services/forumService';
import socketService from '../services/socketService';
import authService from '../services/authService';
import MessageList from './forum/MessageList';
import MessageInput from './forum/MessageInput';
import PinnedMessages from './forum/PinnedMessages';
import Announcements from './forum/Announcements';
import OnlineUsers from './forum/OnlineUsers';
import './forum/forum.css';

const Forum = ({ eventId, isUserOrganizer }) => {
    const [messages, setMessages] = useState([]);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [threadReplies, setThreadReplies] = useState({}); // { parentMessageId: Message[] }
    const [expandedThreads, setExpandedThreads] = useState(new Set()); // Set of parent message IDs
    const [loadingThread, setLoadingThread] = useState(null); // messageId when loading

    const currentUser = authService.getCurrentUser();

    // Load messages
    const loadMessages = useCallback(async (page = 1, append = false) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await forumService.getEventMessages(eventId, page);
            
            if (append) {
                setMessages(prev => [...prev, ...response.messages]);
            } else {
                setMessages(response.messages);
            }
            
            setPagination(response.pagination);
            setHasMore(response.pagination.page < response.pagination.pages);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    // Load pinned messages
    const loadPinnedMessages = useCallback(async () => {
        try {
            const pinned = await forumService.getPinnedMessages(eventId);
            setPinnedMessages(pinned);
        } catch (err) {
            console.error('Failed to load pinned messages:', err);
        }
    }, [eventId]);

    // Load announcements
    const loadAnnouncements = useCallback(async () => {
        try {
            const announcements = await forumService.getAnnouncements(eventId);
            setAnnouncements(announcements);
        } catch (err) {
            console.error('Failed to load announcements:', err);
        }
    }, [eventId]);

    // Setup socket event listeners
    const setupSocketListeners = useCallback(() => {
        // New message
        socketService.on('new-message', (message) => {
            const parentId = message.parentMessageId?._id || message.parentMessageId;
            if (parentId) {
                setThreadReplies(prev => ({
                    ...prev,
                    [parentId]: [...(prev[parentId] || []), message]
                }));
            }
            setMessages(prev => {
                const exists = prev.some(msg => msg._id === message._id);
                if (!exists) {
                    if (parentId) return prev;
                    return [message, ...prev];
                }
                return prev;
            });
        });

        // Message edited
        socketService.on('message-edited', (data) => {
            setMessages(prev => prev.map(msg => 
                msg._id === data.messageId 
                    ? { ...msg, content: data.content, editHistory: data.editHistory }
                    : msg
            ));
        });

        // Message deleted
        socketService.on('message-deleted', (data) => {
            setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
            setThreadReplies(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(parentId => {
                    next[parentId] = next[parentId].filter(m => m._id !== data.messageId);
                });
                return next;
            });
        });

        // Message pinned/unpinned
        socketService.on('message-pinned', (data) => {
            setMessages(prev => prev.map(msg => 
                msg._id === data.messageId 
                    ? { ...msg, isPinned: data.isPinned }
                    : msg
            ));
            
            // Refresh pinned messages
            loadPinnedMessages();
        });

        // Announcement marked/unmarked
        socketService.on('announcement-updated', (data) => {
            setMessages(prev => prev.map(msg => 
                msg._id === data.messageId 
                    ? { ...msg, isAnnouncement: data.isAnnouncement }
                    : msg
            ));
            
            // Refresh announcements
            loadAnnouncements();
        });

        // User joined/left
        socketService.on('user-joined', (user) => {
            setOnlineUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
        });

        socketService.on('user-left', (user) => {
            setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId));
        });

        // Error handling
        socketService.on('error', (data) => {
            setError(data.message);
        });

        // Reaction updates
        socketService.on('reaction-updated', (data) => {
            const updateReactions = (msg) => msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg;
            setMessages(prev => prev.map(updateReactions));
            setThreadReplies(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(parentId => {
                    next[parentId] = next[parentId].map(updateReactions);
                });
                return next;
            });
        });
    }, [loadPinnedMessages, loadAnnouncements]);

    // Initialize socket connection
    useEffect(() => {
        const initializeSocket = async () => {
            try {
                const token = authService.getToken();
                await socketService.connect(token);
                socketService.joinEvent(eventId);
                setupSocketListeners();
            } catch (err) {
                console.error('Failed to initialize socket:', err);
                setError('Failed to connect to real-time updates');
            }
        };

        initializeSocket();

        return () => {
            // Clean up socket listeners
            socketService.off('new-message', () => {});
            socketService.off('message-edited', () => {});
            socketService.off('message-deleted', () => {});
            socketService.off('message-pinned', () => {});
            socketService.off('announcement-updated', () => {});
            socketService.off('user-joined', () => {});
            socketService.off('user-left', () => {});
            socketService.off('error', () => {});
            socketService.off('reaction-updated', () => {});
            socketService.leaveEvent();
        };
    }, [eventId, setupSocketListeners]);

    // Load initial data
    useEffect(() => {
        // Clear previous data when event changes
        setMessages([]);
        setPinnedMessages([]);
        setAnnouncements([]);
        
        // Load fresh data
        loadMessages();
        loadPinnedMessages();
        loadAnnouncements();
    }, [eventId, loadMessages, loadPinnedMessages, loadAnnouncements]);

    // Load more messages
    const loadMore = useCallback(() => {
        if (hasMore && pagination) {
            loadMessages(pagination.page + 1, true);
        }
    }, [hasMore, pagination, loadMessages]);

    // Auto-refresh messages periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (hasMore && pagination && pagination.page < pagination.pages) {
                loadMore();
            }
        }, 30000); // Check for new messages every 30 seconds

        return () => clearInterval(interval);
    }, [hasMore, pagination, loadMore]);

    // Handle sending message
    const handleSendMessage = async (content, parentMessageId = null) => {
        try {
            await socketService.sendMessage(eventId, content, parentMessageId);
            setReplyingTo(null);
        } catch (err) {
            setError('Failed to send message');
        }
    };

    // Handle editing message
    const handleEditMessage = async (messageId, content) => {
        try {
            await socketService.editMessage(messageId, content);
            setEditingMessage(null);
        } catch (err) {
            setError('Failed to edit message');
        }
    };

    // Handle deleting message
    const handleDeleteMessage = async (messageId) => {
        try {
            await socketService.deleteMessage(messageId);
        } catch (err) {
            setError('Failed to delete message');
        }
    };

    // Handle pinning message
    const handlePinMessage = async (messageId, isPinned) => {
        try {
            await socketService.pinMessage(messageId, isPinned);
        } catch (err) {
            setError('Failed to pin message');
        }
    };

    // Handle marking announcement
    const handleMarkAnnouncement = async (messageId, isAnnouncement) => {
        try {
            await socketService.markAnnouncement(messageId, isAnnouncement);
        } catch (err) {
            setError('Failed to update announcement status');
        }
    };

    // Handle adding reaction
    const handleAddReaction = async (messageId, emoji) => {
        try {
            await socketService.addReaction(messageId, emoji);
        } catch (err) {
            setError('Failed to add reaction');
        }
    };

    // Load thread (replies) for a message
    const handleToggleReplies = useCallback(async (parentMessageId) => {
        const isExpanded = expandedThreads.has(parentMessageId);
        if (isExpanded) {
            setExpandedThreads(prev => {
                const next = new Set(prev);
                next.delete(parentMessageId);
                return next;
            });
            return;
        }
        setLoadingThread(parentMessageId);
        try {
            const data = await forumService.getMessageThread(parentMessageId);
            setThreadReplies(prev => ({ ...prev, [parentMessageId]: data.replies || [] }));
            setExpandedThreads(prev => new Set(prev).add(parentMessageId));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load replies');
        } finally {
            setLoadingThread(null);
        }
    }, [expandedThreads]);

    if (loading && messages.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="forum-container max-w-6xl mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Discussion Forum</h2>
                <div className="flex items-center justify-between">
                    <p className="text-gray-600">
                        Connect with other participants and organizers
                    </p>
                    <OnlineUsers users={onlineUsers} />
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                    <button 
                        onClick={() => setError(null)}
                        className="ml-4 text-red-500 hover:text-red-700"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Pinned Messages */}
            <PinnedMessages 
                pinnedMessages={pinnedMessages}
                onReply={setReplyingTo}
                onEdit={setEditingMessage}
                onDelete={handleDeleteMessage}
                onPin={handlePinMessage}
                onMarkAnnouncement={handleMarkAnnouncement}
                onAddReaction={handleAddReaction}
                onEditMessage={handleEditMessage}
                isUserOrganizer={isUserOrganizer}
                currentUserId={currentUser?.id}
                editingMessage={editingMessage}
                onCancelEdit={() => setEditingMessage(null)}
            />

            {/* Announcements */}
            <Announcements 
                announcements={announcements}
                onReply={setReplyingTo}
                isUserOrganizer={isUserOrganizer}
                currentUserId={currentUser?.id}
            />

            {/* Messages Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">Discussion</h3>
                </div>
                
                <div className="p-6">
                    {/* Messages List */}
                    <MessageList
                        messages={messages}
                        onReply={setReplyingTo}
                        onEdit={setEditingMessage}
                        onDelete={handleDeleteMessage}
                        onPin={handlePinMessage}
                        onMarkAnnouncement={handleMarkAnnouncement}
                        onAddReaction={handleAddReaction}
                        onEditMessage={handleEditMessage}
                        isUserOrganizer={isUserOrganizer}
                        currentUserId={currentUser?.id}
                        editingMessage={editingMessage}
                        onCancelEdit={() => setEditingMessage(null)}
                        hasMore={hasMore}
                        onLoadMore={loadMore}
                        loading={loading}
                        threadReplies={threadReplies}
                        expandedThreads={expandedThreads}
                        onToggleReplies={handleToggleReplies}
                        loadingThread={loadingThread}
                    />
                </div>
            </div>

            {/* Message Input */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <MessageInput
                    onSendMessage={handleSendMessage}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    placeholder="Share your thoughts with the community..."
                />
            </div>
        </div>
    );
};

export default Forum;
