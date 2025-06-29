// frontend/src/pages/chat/index.js
import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you're using react-router-dom
import api from '../../utils/api'; // Your Axios instance
import MessageItem from '../../components/MessageItem'; // Your MessageItem component
import './Chat.css'; // Assuming you have a Chat.css file for styling

// Reducer for managing chat state
const chatReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_CONVERSATIONS':
            return { ...state, conversations: action.payload };
        case 'ADD_CONVERSATION':
            return { ...state, conversations: [action.payload, ...state.conversations] };
        case 'UPDATE_CONVERSATION':
            return {
                ...state,
                conversations: state.conversations.map(conv =>
                    conv._id === action.payload._id ? action.payload : conv
                ),
                selectedConversation: state.selectedConversation?._id === action.payload._id ? action.payload : state.selectedConversation
            };
        case 'SET_SELECTED_CONVERSATION':
            return { ...state, selectedConversation: action.payload };
        case 'SET_MESSAGES':
            return { ...state, messages: action.payload };
        case 'ADD_MESSAGE':
            return { ...state, messages: [...state.messages, action.payload] };
        case 'SET_SENDING_MESSAGE':
            return { ...state, sendingMessage: action.payload };
        default:
            return state;
    }
};

const Chat = () => {
    const navigate = useNavigate();
    const [state, dispatch] = useReducer(chatReducer, {
        conversations: [],
        selectedConversation: null,
        messages: [],
        loading: true,
        error: null,
        messageInput: '',
        sendingMessage: false,
        isEditingTitle: false, // For renaming conversation
        newTitle: ''
    });

    const messagesEndRef = useRef(null); // Ref for auto-scrolling

    // Auto-scroll to the bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.messages]);

    // Check authentication on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    // Fetch conversations for the logged-in user
    const fetchConversations = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const userId = localStorage.getItem('userId'); // Assuming userId is stored in localStorage
            if (!userId) {
                console.error("User ID not found in localStorage.");
                dispatch({ type: 'SET_ERROR', payload: 'User not logged in.' });
                navigate('/login');
                return;
            }
            const res = await api.get(`/chat/conversations/${userId}`);
            dispatch({ type: 'SET_CONVERSATIONS', payload: res.data });
            dispatch({ type: 'SET_LOADING', payload: false });

            // If there are conversations, select the first one by default
            if (res.data.length > 0 && !state.selectedConversation) {
                selectConversation(res.data[0]);
            } else if (res.data.length > 0 && state.selectedConversation) {
                // If we had a selected conversation, ensure it's still in the list and update it
                const currentSelected = res.data.find(conv => conv._id === state.selectedConversation._id);
                if (currentSelected) {
                    dispatch({ type: 'SET_SELECTED_CONVERSATION', payload: currentSelected });
                } else {
                    // If the previously selected conversation is no longer there, select the first one
                    selectConversation(res.data[0]);
                }
            } else if (res.data.length === 0) {
                // If no conversations, ensure no conversation is selected
                dispatch({ type: 'SET_SELECTED_CONVERSATION', payload: null });
                dispatch({ type: 'SET_MESSAGES', payload: [] });
            }

        } catch (err) {
            console.error('Error fetching conversations:', err.response?.data || err.message);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversations.' });
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [navigate, state.selectedConversation]);


    // Fetch messages for a selected conversation
    const fetchMessages = useCallback(async (conversationId) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const res = await api.get(`/chat/messages/${conversationId}`);
            dispatch({ type: 'SET_MESSAGES', payload: res.data });
        } catch (err) {
            console.error('Error fetching messages:', err.response?.data || err.message);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    // Effect to fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]); // Dependency on fetchConversations for initial load

    // Effect to fetch messages when selectedConversation changes
    useEffect(() => {
        if (state.selectedConversation) {
            fetchMessages(state.selectedConversation._id);
            dispatch({ type: 'newTitle', payload: state.selectedConversation.title }); // Set newTitle for editing
        } else {
            dispatch({ type: 'SET_MESSAGES', payload: [] }); // Clear messages if no conversation selected
        }
    }, [state.selectedConversation, fetchMessages]);


    const selectConversation = (conversation) => {
        dispatch({ type: 'SET_SELECTED_CONVERSATION', payload: conversation });
        dispatch({ type: 'isEditingTitle', payload: false }); // Exit editing mode when selecting new convo
        dispatch({ type: 'newTitle', payload: conversation.title });
    };

    const createNewConversation = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                console.error("User ID not found in localStorage.");
                navigate('/login');
                return;
            }
            const res = await api.post(`/chat/conversations/${userId}`, { title: 'New Chat' });
            dispatch({ type: 'ADD_CONVERSATION', payload: res.data });
            selectConversation(res.data); // Automatically select the new conversation
        } catch (err) {
            console.error('Error creating conversation:', err.response?.data || err.message);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to create new conversation.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!state.messageInput.trim() || !state.selectedConversation || state.sendingMessage) {
            return;
        }

        dispatch({ type: 'SET_SENDING_MESSAGE', payload: true });
        const userMessageContent = state.messageInput;
        dispatch({ type: 'messageInput', payload: '' }); // Clear input immediately

        // Optimistically add user's message to UI
        const optimisticUserMessage = {
            _id: Date.now() + '-user', // Temporary ID
            conversationId: state.selectedConversation._id,
            sender: 'user',
            content: userMessageContent,
            createdAt: new Date().toISOString()
        };
        dispatch({ type: 'ADD_MESSAGE', payload: optimisticUserMessage });

        try {
            const res = await api.post(`/chat/messages/${state.selectedConversation._id}`, { message: userMessageContent });
            // The backend returns all messages, so replace the current list
            dispatch({ type: 'SET_MESSAGES', payload: res.data.messages });
        } catch (err) {
            console.error('Error sending message:', err.response?.data || err.message);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to send message and get AI response.' });
            // Optionally, remove the optimistic message or mark it as failed
            // For simplicity, we'll just show the error and assume the backend's list is authoritative.
        } finally {
            dispatch({ type: 'SET_SENDING_MESSAGE', payload: false });
        }
    };

    const handleRenameClick = () => {
        dispatch({ type: 'isEditingTitle', payload: true });
        dispatch({ type: 'newTitle', payload: state.selectedConversation.title });
    };

    const handleTitleChange = (e) => {
        dispatch({ type: 'newTitle', payload: e.target.value });
    };

    const handleRenameSubmit = async (e) => {
        e.preventDefault();
        if (!state.newTitle.trim() || !state.selectedConversation) {
            return;
        }

        try {
            const res = await api.put(`/chat/conversations/${state.selectedConversation._id}`, { title: state.newTitle.trim() });
            dispatch({ type: 'UPDATE_CONVERSATION', payload: res.data });
            dispatch({ type: 'isEditingTitle', payload: false });
            // Re-fetch conversations to ensure the list is updated, in case of sorting changes etc.
            fetchConversations();
        } catch (err) {
            console.error('Error renaming conversation:', err.response?.data || err.message);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to rename conversation.' });
        }
    };

    const handleCancelRename = () => {
        dispatch({ type: 'isEditingTitle', payload: false });
        dispatch({ type: 'newTitle', payload: state.selectedConversation?.title || '' });
    };


    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId'); // Remove userId as well
        navigate('/login');
    };

    if (state.loading && !state.selectedConversation) { // Only show full loading on initial load
        return <div className="loading-spinner">Loading conversations...</div>;
    }

    if (state.error) {
        return <div className="error-message">Error: {state.error}</div>;
    }

    return (
        <div className="chat-page">
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Conversations</h2>
                    <button onClick={createNewConversation} className="new-chat-btn">
                        + New Chat
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
                <div className="conversation-list">
                    {state.conversations.length === 0 && !state.loading ? (
                        <p className="no-conversations">No conversations yet. Start a new chat!</p>
                    ) : (
                        state.conversations.map((conv) => (
                            <div
                                key={conv._id}
                                className={`conversation-item ${state.selectedConversation?._id === conv._id ? 'active' : ''}`}
                                onClick={() => selectConversation(conv)}
                            >
                                {conv.title}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="chat-area">
                {state.selectedConversation ? (
                    <>
                        <div className="chat-header">
                            {state.isEditingTitle ? (
                                <form onSubmit={handleRenameSubmit} className="rename-form">
                                    <input
                                        type="text"
                                        value={state.newTitle}
                                        onChange={handleTitleChange}
                                        onBlur={handleRenameSubmit} // Submit on blur
                                        autoFocus
                                        className="rename-input"
                                    />
                                    <button type="submit" className="rename-save-btn">Save</button>
                                    <button type="button" onClick={handleCancelRename} className="rename-cancel-btn">Cancel</button>
                                </form>
                            ) : (
                                <>
                                    <h3>{state.selectedConversation.title}</h3>
                                    <button onClick={handleRenameClick} className="rename-button">
                                        Rename
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="messages-display">
                            {state.messages.map((msg) => (
                                <MessageItem key={msg._id} message={msg} />
                            ))}
                            {state.sendingMessage && <div className="typing-indicator">AI is typing...</div>}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={sendMessage} className="message-input-form">
                            <input
                                type="text"
                                value={state.messageInput}
                                onChange={(e) => dispatch({ type: 'messageInput', payload: e.target.value })}
                                placeholder="Type your message..."
                                disabled={state.sendingMessage}
                                className="message-input"
                            />
                            <button type="submit" disabled={!state.messageInput.trim() || state.sendingMessage} className="send-button">
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-conversation-selected">
                        Select a conversation or start a new one.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;