import { useState, useRef, useEffect } from 'react';

export default function ConversationList({ 
  conversations = [], 
  currentConversation, 
  onSelectConversation, 
  onRenameConversation 
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const editInputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Get conversation display title
  const getTitle = (conv) => {
    return conv.title || `Chat ${new Date(conv.createdAt).toLocaleDateString()}`;
  };

  // Start editing
  const handleStartEdit = (conv, e) => {
    e.stopPropagation();
    console.log('Starting edit for conversation:', conv._id, 'Current title:', getTitle(conv));
    setEditingId(conv._id);
    setEditTitle(getTitle(conv));
  };

  // Save edit with proper async handling
  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) {
      console.log('Save cancelled - missing data:', { editingId, editTitle });
      handleCancelEdit();
      return;
    }

    console.log('Attempting to save:', { editingId, editTitle: editTitle.trim() });
    
    try {
      setIsLoading(true);
      
      // Call the rename function and wait for it
      await onRenameConversation(editingId, editTitle.trim());
      
      console.log('Rename successful');
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Rename failed:', error);
      // Don't exit edit mode on error, let user try again
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    console.log('Cancelling edit');
    setEditingId(null);
    setEditTitle('');
    setIsLoading(false);
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Modified onBlur to prevent immediate save
  const handleBlur = (e) => {
    // Don't save on blur if user clicked cancel or save buttons
    if (e.relatedTarget?.className?.includes('cancel-btn') || 
        e.relatedTarget?.className?.includes('save-btn')) {
      return;
    }
    
    // Small delay to allow button clicks to register
    setTimeout(() => {
      if (editingId) {
        handleSaveEdit();
      }
    }, 150);
  };

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="conversation-list-empty">
        <div className="empty-icon">💬</div>
        <p>No conversations yet</p>
        <p>Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <ul className="conversation-list">
      {conversations.map((conv) => (
        <li
          key={conv._id}
          className={`conversation-item ${
            currentConversation?._id === conv._id ? 'active' : ''
          } ${editingId === conv._id ? 'editing' : ''}`}
        >
          {editingId === conv._id ? (
            // Edit mode
            <div className="edit-container">
              <input
                ref={editInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="edit-input"
                maxLength={100}
                disabled={isLoading}
                placeholder="Enter conversation title..."
              />
              <div className="edit-actions">
                <button 
                  onClick={handleSaveEdit} 
                  className="save-btn" 
                  title="Save"
                  disabled={isLoading}
                >
                  {isLoading ? '⏳' : '✓'}
                </button>
                <button 
                  onClick={handleCancelEdit} 
                  className="cancel-btn" 
                  title="Cancel"
                  disabled={isLoading}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            // Normal mode
            <div 
              className="conversation-content" 
              onClick={() => onSelectConversation(conv)}
            >
              <span className="conversation-title">
                {getTitle(conv)}
              </span>
              <button
                onClick={(e) => handleStartEdit(conv, e)}
                className="rename-btn"
                title="Rename"
              >
                ✏️
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}