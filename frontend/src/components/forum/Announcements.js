import React from 'react';

const Announcements = ({
    announcements,
    onReply,
    isUserOrganizer,
    currentUserId
}) => {
    if (!announcements || announcements.length === 0) return null;

    return (
        <div className="announcements mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            
            
            <div className="space-y-3">
                {announcements.map((announcement) => (
                    <div key={announcement._id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <div className="flex items-start space-x-3">
                            
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">
                                            {announcement.senderId.firstName} {announcement.senderId.lastName}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {new Date(announcement.createdAt).toLocaleDateString()} at {new Date(announcement.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                    
                                    {/* Reply Button */}
                                    <button
                                        onClick={() => onReply(announcement)}
                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                        <span>Reply</span>
                                    </button>
                                </div>
                                
                                <div className="text-gray-800 whitespace-pre-wrap">
                                    {announcement.content}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Announcements;
