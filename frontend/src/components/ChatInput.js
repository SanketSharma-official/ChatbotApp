// frontend/src/components/ChatInput.js
import { useState, useRef, useEffect, useCallback } from 'react';

export default function ChatInput({ onSendMessage, disabled = false }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  // Constants
  const MAX_HEIGHT = 150;
  const MIN_ROWS = 1;
  const PLACEHOLDER_TEXT = 'Type your message... (Shift+Enter for new line)';

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height with max limit
    const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
    
    // Add scrollbar if content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  // Adjust height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Focus textarea on component mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    
    // Reset textarea height after clearing
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, 0);
  }, [message, onSendMessage, disabled]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    // Optional: Add Escape key to clear input
    if (e.key === 'Escape') {
      setMessage('');
      e.target.blur();
    }
  }, [handleSubmit]);

  // Handle input changes
  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
  }, []);

  // Check if send button should be enabled
  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="chat-input-wrapper">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="textarea-container">
          <textarea
            ref={textareaRef}
            className={`chat-textarea ${disabled ? 'disabled' : ''}`}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Please wait...' : PLACEHOLDER_TEXT}
            rows={MIN_ROWS}
            disabled={disabled}
            aria-label="Message input"
            aria-describedby="chat-input-help"
          />
          
          <button 
            type="submit" 
            className={`send-button ${canSend ? 'enabled' : 'disabled'}`}
            aria-label="Send message"
            disabled={!canSend}
            title={canSend ? 'Send message' : 'Enter a message to send'}
          >
            <span className="send-icon" aria-hidden="true">
              {disabled ? '⏳' : '➤'}
            </span>
          </button>
        </div>
        
        <div id="chat-input-help" className="chat-input-help">
          <span className="help-text">
            Press Enter to send, Shift+Enter for new line
            {disabled && ' • Please wait for response...'}
          </span>
        </div>
      </form>
    </div>
  );
}