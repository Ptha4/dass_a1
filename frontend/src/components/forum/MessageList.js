import React from 'react';
import MessageItem from './MessageItem';

const MessageList = ({
    messages,
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
    hasMore,
    onLoadMore,
    loading,
    threadReplies = {},
    expandedThreads = new Set(),
    onToggleReplies,
    loadingThread
}) => {
    return (
        <div className="message-list space-y-4">
            {messages.map((message) => {
                const replies = threadReplies[message._id];
                const isExpanded = expandedThreads.has(message._id);
                const replyCount = replies ? replies.length : 0;
                return (
                    <div key={message._id} className="space-y-2">
                        <MessageItem
                            message={message}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onPin={onPin}
                            onMarkAnnouncement={onMarkAnnouncement}
                            onAddReaction={onAddReaction}
                            onEditMessage={onEditMessage}
                            isUserOrganizer={isUserOrganizer}
                            currentUserId={currentUserId}
                            editingMessage={editingMessage}
                            onCancelEdit={onCancelEdit}
                            replyCount={replyCount}
                            onToggleReplies={onToggleReplies}
                            isThreadExpanded={isExpanded}
                            isReplyItem={false}
                        />
                        {isExpanded && replies && replies.length > 0 && (
                            <div className="thread-replies pl-2 border-l-2 border-gray-200 space-y-2">
                                {replies.map((reply) => (
                                    <MessageItem
                                        key={reply._id}
                                        message={reply}
                                        onReply={onReply}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onPin={onPin}
                                        onMarkAnnouncement={onMarkAnnouncement}
                                        onAddReaction={onAddReaction}
                                        onEditMessage={onEditMessage}
                                        isUserOrganizer={isUserOrganizer}
                                        currentUserId={currentUserId}
                                        editingMessage={editingMessage}
                                        onCancelEdit={onCancelEdit}
                                        isReplyItem={true}
                                    />
                                ))}
                            </div>
                        )}
                        {isExpanded && loadingThread === message._id && (
                            <div className="pl-6 text-sm text-gray-500">Loading replies...</div>
                        )}
                    </div>
                );
            })}
            
            {/* Load More Button */}
            {hasMore && (
                <div className="text-center py-4">
                    <button
                        onClick={onLoadMore}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'Load More Messages'}
                    </button>
                </div>
            )}
            
            {/* No Messages */}
            {messages.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-sm">Be the first to start the conversation!</p>
                </div>
            )}
        </div>
    );
};

export default MessageList;
