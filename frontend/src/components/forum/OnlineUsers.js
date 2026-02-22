import React from 'react';

const OnlineUsers = ({ users }) => {
    const onlineCount = users.length;

    return (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="flex -space-x-2">
                {/* Show up to 3 user avatars */}
                {users.slice(0, 3).map((user, index) => (
                    <div
                        key={user.userId}
                        className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                        title={user.userName}
                    >
                        {user.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                ))}
                
                {/* Show count if more than 3 users */}
                {onlineCount > 3 && (
                    <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-gray-700 text-xs font-medium">
                        +{onlineCount - 3}
                    </div>
                )}
            </div>
            
            <span>
                {onlineCount === 0 ? (
                    'No one is online'
                ) : onlineCount === 1 ? (
                    '1 person online'
                ) : (
                    `${onlineCount} people online`
                )}
            </span>
        </div>
    );
};

export default OnlineUsers;
