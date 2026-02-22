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
            <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Announcements</h3>
                <span className="text-sm text-gray-500">({announcements.length})</span>
            </div>
            
            <div className="space-y-3">
                {announcements.map((announcement) => (
                    <div key={announcement._id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
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
