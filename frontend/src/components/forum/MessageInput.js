import React, { useState, useRef } from 'react';

const MessageInput = ({ onSendMessage, replyingTo, onCancelReply, placeholder = "Type your message..." }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!message.trim() || isSubmitting) return;

        setIsSubmitting(true);
        
        try {
            await onSendMessage(message.trim(), replyingTo?._id || replyingTo?.messageId);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleChange = (e) => {
        setMessage(e.target.value);
        
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    const maxLength = 2000;
    const remainingChars = maxLength - message.length;
    const isOverLimit = remainingChars < 0;

    return (
        <div className="message-input">
            {/* Reply Indicator */}
            {replyingTo && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-900">Replying to {replyingTo.senderId?.firstName} {replyingTo.senderId?.lastName}</p>
                            <p className="text-xs text-blue-700 truncate max-w-md">{replyingTo.content}</p>
                            {message.trim() && (
                                <button
                                    type="button"
                                    onClick={() => setMessage('')}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Message Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={`w-full px-4 py-3 pr-12 border ${isOverLimit ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg resize-none focus:outline-none focus:ring-2 transition-colors`}
                        rows={3}
                        disabled={isSubmitting}
                        maxLength={maxLength}
                    />
                    
                    {/* Character Count */}
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {message.length}/{maxLength}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!message.trim() || isSubmitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Send
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Help Text */}
            <div className="text-xs text-gray-500 mt-2">
                Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 rounded">Shift+Enter</kbd> for new line
            </div>
        </div>
    );
};

export default MessageInput;
