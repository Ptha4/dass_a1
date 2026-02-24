import React from 'react';
import MessageItem from './MessageItem';

const PinnedMessages = ({
    pinnedMessages,
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
    onCancelEdit
}) => {
    if (!pinnedMessages || pinnedMessages.length === 0) return null;

    return (
        <div className="pinned-messages mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
                <svg className="w-2 h-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Pinned Messages</h3>
                <span className="text-sm text-gray-500">({pinnedMessages.length})</span>
            </div>
            
            <div className="space-y-3">
                {pinnedMessages.map((message) => (
                    <div key={message._id} className="relative">
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
                            isReplyItem={false}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PinnedMessages;
