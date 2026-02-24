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
    isReplyItem,
    depth = 0
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

    const indentStyle = isReplyItem ? { marginLeft: `${24 + depth * 28}px` } : {};

    return (
        <div
            style={indentStyle}
            className={`
            relative rounded-xl p-4 transition-all duration-200
            ${isReplyItem ? 'pl-4 border-l-2 border-gray-300 bg-gray-50 rounded-lg' : ''}
            ${message.isAnnouncement
                    ? 'bg-blue-50 border border-blue-200'
                    : message.isPinned
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-white border border-gray-200'
                }
            hover:shadow-md
        `}
        >
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

            {/* Message Header */}
            <div className="flex items-start justify-between mb-3">

                {/* Left: Avatar + Info */}
                <div className="flex items-start gap-3">

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 
                                flex items-center justify-center text-white text-sm font-semibold shadow">
                        {senderInitials(message.senderId)}
                    </div>

                    {/* Name + Meta */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                                 {senderName(message.senderId)}
                            </span>

                            {message.senderRole === 'organizer' && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                     Organizer
                                </span>
                            )}

                            {message.isPinned && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                    ( Pinned ) 
                                </span>
                            )}

                            {message.isAnnouncement && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    ( 📢 Announcement )
                                </span>
                            )}
                        </div>

                        <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            {message.editHistory?.length > 0 && ' • Edited'}
                        </span>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReply(message); }}
                        className="hover:text-blue-600 hover:bg-blue-50 transition text-sm p-1.5 rounded"
                        title="Reply"
                    >
                        ↩ Reply
                    </button>
                    {isOwnMessage && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onEdit(message); }}
                            className="hover:text-blue-600 hover:bg-blue-50 transition text-sm p-1.5 rounded"
                            title="Edit"
                        >
                            ✎ Edit
                        </button>
                    )}
                    {(isOwnMessage || isUserOrganizer) && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDelete(message._id); }}
                            className="hover:text-red-600 hover:bg-red-50 transition text-sm p-1.5 rounded"
                            title="Delete"
                        >
                            🗑 Delete
                        </button>
                    )}
                    {isUserOrganizer && onPin && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onPin(message._id, !message.isPinned); }}
                            className={`transition text-sm p-1.5 rounded ${
                                message.isPinned
                                    ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                                    : 'hover:text-yellow-600 hover:bg-yellow-50'
                            }`}
                            title={message.isPinned ? 'Unpin' : 'Pin'}
                        >
                            {message.isPinned ? '📌 Unpin' : '📌 Pin'}
                        </button>
                    )}
                    {isUserOrganizer && onMarkAnnouncement && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onMarkAnnouncement(message._id, !message.isAnnouncement); }}
                            className={`transition text-sm p-1.5 rounded ${
                                message.isAnnouncement
                                    ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                                    : 'hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={message.isAnnouncement ? 'Remove Announcement' : 'Mark as Announcement'}
                        >
                            {message.isAnnouncement ? '📢 Remove' : '📢 Announce'}
                        </button>
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
            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                            focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleEdit}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                            >
                                Save
                            </button>
                            <button
                                onClick={onCancelEdit}
                                className="px-3 py-1 bg-gray-200 rounded-md text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    message.content
                )}
            </div>

            {/* Thread toggle - show for all messages that can have replies */}
            {onToggleReplies && (
                <button
                    type="button"
                    onClick={() => onToggleReplies(message._id)}
                    className="text-sm text-blue-600 hover:underline mb-2"
                >
                    {isThreadExpanded
                        ? `Hide replies${replyCount > 0 ? ` (${replyCount})` : ''}`
                        : replyCount > 0
                            ? `View ${replyCount} repl${replyCount !== 1 ? 'ies' : 'y'}`
                            : 'View replies'}
                </button>
            )}

            {/* Reactions Section */}
            <div className="mt-3 flex flex-col gap-2">

                {/* Existing Reactions */}
                {reactionEntries.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {reactionEntries.map(([emoji, users]) => {
                            const userList = Array.isArray(users) ? users : [];
                            const hasReacted = currentUserIdStr && userList.some(u => String(u) === currentUserIdStr);

                            return (
                                <button
                                    type="button"
                                    key={emoji}
                                    onClick={(e) => { e.preventDefault(); onAddReaction(message._id, emoji); }}
                                    className={`group relative flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                                                    ${hasReacted
                                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="text-base">{emoji}</span>
                                    <span>{userList.length}</span>

                                    {/* Tooltip */}
                                    {userList.length > 0 && (
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block 
                                                                    bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                                            {userList.length} reaction{userList.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Add Reaction Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowReactionPicker(!showReactionPicker);
                            setShowMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full 
                                            bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm border border-gray-300 transition"
                    >
                        <span>😊</span>
                        <span>Add reaction</span>
                    </button>

                    {/* Reaction Picker */}
                    {showReactionPicker && (
                        <div className="absolute mt-2 bg-white border border-gray-200 
                                                    rounded-xl shadow-xl p-3 z-50 w-max">
                            <div className="flex gap-2 text-xl">
                                {['👍', '❤️', '😊', '🎉', '🤔', '👎', '🔥', '👏'].map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            onAddReaction(message._id, emoji);
                                            setShowReactionPicker(false);
                                        }}
                                        className="hover:bg-gray-100 p-2 rounded-lg transition transform hover:scale-110"
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
