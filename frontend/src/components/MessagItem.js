import React from 'react';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import rehypeRaw from 'rehype-raw'; // Optional, but good practice for full markdown support

import './MessageItem.css'; // Your existing CSS for message styling

const MessageItem = ({ message }) => {
    const isUser = message.sender === 'user';
    const messageClass = isUser ? 'user-message' : 'ai-message';

    return (
        <div className={`message-item ${messageClass}`}>
            <div className="message-content">
                {/* Use ReactMarkdown to render the message content */}
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {message.content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MessageItem;