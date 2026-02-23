import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const senderName = (sender) => {
    if (!sender) return 'Unknown';
    if (typeof sender === 'object' && sender.firstName != null) return `${sender.firstName} ${sender.lastName || ''}`.trim();
    return 'Unknown';
};

const senderInitials = (sender) => {
    if (!sender || typeof sender !== 'object') return '?';
    const first = (sender.firstName && sender.firstName[0]) || '';
    const last = (sender.lastName && sender.lastName[0]) || '';
    return (first + last).toUpperCase() || '?';
};

const MessageItem = ({
    message,
    onReply,
    onEdit,
    onDelete,
    onPin,
    onMarkAnnouncement,
    onAddReaction,
    onEditMessage,
    isUserOrganizer,
    currentUserId,
    editingMessage,
    onCancelEdit,
    replyCount,
    onToggleReplies,
    isThreadExpanded,
    isReplyItem
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const menuRef = useRef(null);
    const isOwnMessage = currentUserId && String(message.senderId?._id || message.senderId) === String(currentUserId);
    const isEditing = editingMessage?._id === message._id;

    useEffect(() => {
        setEditContent(message.content);
    }, [message.content]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
                setShowReactionPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEdit = () => {
        if (editContent.trim()) {
            onEditMessage(message._id, editContent);
        }
    };

    const reactionsObj = message.reactions && typeof message.reactions === 'object' && !Array.isArray(message.reactions)
        ? message.reactions
        : {};
    const reactionEntries = Object.entries(reactionsObj);
    const currentUserIdStr = currentUserId ? String(currentUserId) : '';

    return (
        <div className={`message-item group ${message.isPinned ? 'border-l-4 border-yellow-400' : ''} ${message.isAnnouncement ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' : 'bg-white border border-gray-200'} rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 relative ${isReplyItem ? 'ml-6 border-l-2 border-gray-200' : ''}`}>
            
            {/* Pinned Badge */}
            {message.isPinned && (
                <div className="absolute top-2 right-2">
                    <div className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                        Pinned
                    </div>
                </div>
            )}

            {/* Announcement Badge */}
            {message.isAnnouncement && (
                <div className="absolute top-2 right-2">
                    <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Announcement
                    </div>
                </div>
            )}
            
            {/* Message Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                            {senderInitials(message.senderId)}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {senderName(message.senderId)}
                            </p>
                            {message.senderRole === 'organizer' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Organizer
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            {message.editHistory && message.editHistory.length > 0 && message.editHistory[message.editHistory.length - 1].editedAt && (
                                <span className="ml-2 text-gray-400">
                                    • Edited {formatDistanceToNow(new Date(message.editHistory[message.editHistory.length - 1].editedAt), { addSuffix: true })}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                
                {/* Message Actions */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                        title="More options"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 message-actions-dropdown">
                            <button type="button" onClick={() => { onReply(message); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <span>↩</span> Reply
                            </button>
                            {isOwnMessage && (
                                <button type="button" onClick={() => { onEdit(message); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <span>✎</span> Edit
                                </button>
                            )}
                            {(isOwnMessage || isUserOrganizer) && (
                                <button type="button" onClick={() => { onDelete(message._id); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <span>🗑</span> Delete
                                </button>
                            )}
                            {isUserOrganizer && (
                                <>
                                    <button type="button" onClick={() => { onPin(message._id, !message.isPinned); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                        <span>📌</span> {message.isPinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button type="button" onClick={() => { onMarkAnnouncement(message._id, !message.isAnnouncement); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                        <span>📢</span> {message.isAnnouncement ? 'Unmark announcement' : 'Mark as announcement'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reply Indicator */}
            {message.parentMessageId && (
                <div className="mb-3 p-2 bg-gray-50 rounded border-l-2 border-gray-300">
                    <p className="text-xs text-gray-600 mb-1">Replying to a message</p>
                </div>
            )}

            {/* Message Content */}
            <div className="mb-3">
                {isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Edit your message..."
                        />
                        <div className="flex space-x-2">
                            <button
                                onClick={handleEdit}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={onCancelEdit}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                )}
            </div>

            {/* Thread toggle (top-level only) */}
            {!isReplyItem && onToggleReplies && (
                <div className="mb-3">
                    <button
                        type="button"
                        onClick={() => onToggleReplies(message._id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        {isThreadExpanded
                            ? `Hide replies${replyCount > 0 ? ` (${replyCount})` : ''}`
                            : replyCount > 0
                                ? `View ${replyCount} reply${replyCount !== 1 ? 'ies' : ''}`
                                : 'View replies'}
                    </button>
                </div>
            )}

            {/* Reactions Section */}
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                <div className="flex flex-wrap gap-2">
                    {reactionEntries.map(([emoji, users]) => {
                        const userList = Array.isArray(users) ? users : [];
                        const hasReacted = currentUserIdStr && userList.some(u => String(u) === currentUserIdStr);
                        return (
                            <button
                                key={emoji}
                                onClick={() => onAddReaction(message._id, emoji)}
                                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm transition-colors ${
                                    hasReacted ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                            >
                                <span>{emoji}</span>
                                <span className="text-xs">{userList.length}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setShowReactionPicker(!showReactionPicker); setShowMenu(false); }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                        title="Add reaction"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    {showReactionPicker && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 reaction-picker">
                            <div className="flex space-x-1">
                                {['👍', '❤️', '😊', '🎉', '🤔', '👎'].map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            onAddReaction(message._id, emoji);
                                            setShowReactionPicker(false);
                                        }}
                                        className="text-lg hover:bg-gray-100 p-1 rounded"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
