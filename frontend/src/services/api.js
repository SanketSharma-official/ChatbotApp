// frontend/src/services/api.js
import axios from 'axios';
import { getToken, removeUserData } from './authService';

// Define the backend URL using an environment variable
// Next.js requires environment variables to be prefixed with NEXT_PUBLIC_
// for them to be exposed to the client-side.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Throw an error if the backend URL is not defined, to catch configuration issues early.
if (!BACKEND_URL) {
  console.error('CRITICAL ERROR: NEXT_PUBLIC_BACKEND_URL is not defined!');
  // In a production build, you might want to throw an error or redirect
  // For now, we'll proceed, but API calls will likely fail.
}

// Configure Axios instance for chat-related endpoints
// The base URL for the 'api' instance now points to the chat API path.
// This assumes your backend serves auth routes at /api/auth and chat routes at /api/chat
const api = axios.create({
  baseURL: `${BACKEND_URL}/api/chat`, // Base URL for chat-related endpoints
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('API Error 401: Unauthorized. Token might be invalid or expired.');
      // The Chat component handles redirection, no need to push router here.
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
// These now explicitly use the BACKEND_URL + specific auth path
export const register = (userData) => axios.post(`${BACKEND_URL}/api/auth/register`, userData);
export const login = (credentials) => axios.post(`${BACKEND_URL}/api/auth/login`, credentials);

// Conversation Endpoints
export const getConversations = (userId) => api.get(`/conversations/${userId}`);
export const createConversation = (userId, title = 'New Chat') => api.post(`/conversations/${userId}`, { title });

// Message Endpoints
export const getMessages = (conversationId) => api.get(`/messages/${conversationId}`);
export const sendMessage = (conversationId, messageData) => api.post(`/messages/${conversationId}`, messageData);

// Update Conversation (already correctly using `api` instance in your original code)
export const updateConversation = (conversationId, updateData) => {
  // The 'api' instance already has the base URL and interceptors for headers
  return api.put(`/conversations/${conversationId}`, updateData);
};

// Export the configured api instance (optional, but useful for direct instance access)
export default api;