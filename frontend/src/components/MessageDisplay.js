// frontend/src/components/MessageDisplay.js
import { useEffect, useRef } from 'react';

export default function MessageDisplay({ messages }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-display">
      {messages.length === 0 ? (
        <div className="no-messages-text">
          <div className="empty-chat-icon">💬</div>
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div key={index} className={`message-bubble ${message.sender}`}>
            <div className="message-text">{message.content}</div>
            {message.timestamp && (
              <div className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </div>
            )}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}