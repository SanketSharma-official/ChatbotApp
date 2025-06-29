// frontend/src/pages/index.js (Enhanced Chat Page)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ConversationList from '../components/ConversationList';
import MessageDisplay from '../components/MessageDisplay';
import ChatInput from '../components/ChatInput';
import {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  updateConversation
} from '../services/api';
import {
  getToken,
  getUserId,
  removeUserData
} from '../services/authService';

export default function Chat() {
  const router = useRouter();

  // State management
  const [state, setState] = useState({
    conversations: [],
    currentConversation: null,
    messages: [],
    darkMode: false,
    loading: {
      conversations: true,
      messages: false
    },
    error: ''
  });

  // Initialize component
  useEffect(() => {
    initializeChat();
  }, []);

  // Handle conversation changes
  useEffect(() => {
    if (state.currentConversation) {
      fetchMessages(state.currentConversation._id);
    } else {
      updateState({ messages: [] });
    }
  }, [state.currentConversation]);

  // Helper function to update state
  const updateState = (updates) => {
    setState(prevState => ({ ...prevState, ...updates }));
  };

  // Helper function to update loading state
  const updateLoading = (key, value) => {
    setState(prevState => ({
      ...prevState,
      loading: { ...prevState.loading, [key]: value }
    }));
  };

  // Initialize chat application
  const initializeChat = async () => {
    if (!getToken()) {
      router.push('/auth/login');
      return;
    }

    loadThemePreference();
    await fetchConversations();
  };

  // Load theme from localStorage
  const loadThemePreference = () => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (savedTheme === 'dark') {
      updateState({ darkMode: true });
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newDarkMode = !state.darkMode;
    updateState({ darkMode: newDarkMode });

    if (newDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  // Fetch all conversations for the user
  const fetchConversations = async () => {
    updateLoading('conversations', true);
    updateState({ error: '' });

    try {
      const response = await getConversations(getUserId());
      const conversations = response.data;

      updateState({
        conversations,
        currentConversation: conversations.length > 0 ? conversations[0] : null
      });
    } catch (error) {
      handleApiError(error, 'Failed to fetch conversations.');
    } finally {
      updateLoading('conversations', false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId) => {
    updateLoading('messages', true);
    updateState({ error: '' });

    try {
      const response = await getMessages(conversationId);
      updateState({ messages: response.data });
    } catch (error) {
      handleApiError(error, 'Failed to fetch messages.');
    } finally {
      updateLoading('messages', false);
    }
  };

  // Create a new conversation
  const handleNewConversation = async () => {
    updateState({ error: '' });

    try {
      const response = await createConversation(getUserId());
      const newConversation = response.data;

      updateState({
        conversations: [newConversation, ...state.conversations],
        currentConversation: newConversation,
        messages: []
      });
    } catch (error) {
      handleApiError(error, 'Failed to create new conversation.');
    }
  };

  // Rename an existing conversation
  const handleRenameConversation = async (conversationId, newTitle) => {
    try {
      await updateConversation(conversationId, { title: newTitle });

      const updatedConversations = state.conversations.map(conv =>
        conv._id === conversationId ? { ...conv, title: newTitle } : conv
      );

      const updatedCurrentConversation = state.currentConversation?._id === conversationId
        ? { ...state.currentConversation, title: newTitle }
        : state.currentConversation;

      updateState({
        conversations: updatedConversations,
        currentConversation: updatedCurrentConversation
      });
    } catch (error) {
      updateState({ error: 'Failed to rename conversation.' });
    }
  };

  // Send a new message
  const handleSendMessage = async (text) => {
    if (!state.currentConversation || !text.trim()) return;

    const userMessage = { sender: 'user', content: text };
    const optimisticMessages = [...state.messages, userMessage];

    updateState({ messages: optimisticMessages });

    try {
      const response = await sendMessage(state.currentConversation._id, { message: text });
      updateState({ messages: response.data.messages });
    } catch (error) {
      // Revert optimistic update on error
      updateState({ messages: state.messages });
      handleApiError(error, 'Failed to send message.');
    }
  };

  // Handle API errors consistently
  const handleApiError = (error, defaultMessage) => {
    if (error.response?.status === 401) {
      removeUserData();
      router.push('/auth/login');
    } else {
      updateState({ error: defaultMessage });
    }
  };

  // Handle user logout
  const handleLogout = () => {
    removeUserData();
    router.push('/auth/login');
  };

  // Render loading state
  if (state.loading.conversations) {
    return (
      <div className="chat-layout">
        <div className="sidebar-loading">Loading conversations...</div>
        <div className="chat-main-loading"></div>
      </div>
    );
  }

  // Render main chat interface
  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Chats</h2>
          <div className="header-controls">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title="Toggle theme"
              aria-label={`Switch to ${state.darkMode ? 'light' : 'dark'} mode`}
            >
              {state.darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleNewConversation}
              className="new-chat-button"
              aria-label="Create new chat"
            >
              + New Chat
            </button>
          </div>
        </div>

        <ConversationList
          conversations={state.conversations}
          currentConversation={state.currentConversation}
          onSelectConversation={(conversation) => updateState({ currentConversation: conversation })}
          onRenameConversation={handleRenameConversation}
        />

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {state.error && (
          <div className="chat-error" role="alert">
            {state.error}
          </div>
        )}

        {state.currentConversation ? (
          <>
            <div className="chat-header">
              <h3 className="chat-title">
                {state.currentConversation.title ||
                 `Chat ${new Date(state.currentConversation.createdAt).toLocaleDateString()}`}
              </h3>
            </div>

            <div className="message-display-container">
              {state.loading.messages ? (
                <div className="loading-messages">Loading messages...</div>
              ) : (
                <MessageDisplay messages={state.messages} />
              )}
            </div>

            <div className="chat-input-container">
              <ChatInput onSendMessage={handleSendMessage} />
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="welcome-message">
              <h3>Welcome to your AI Chat!</h3>
              <p>Select a conversation from the sidebar or create a new one to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}