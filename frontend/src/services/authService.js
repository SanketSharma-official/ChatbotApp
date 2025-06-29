// frontend/src/services/authService.js
// Utility functions for handling authentication tokens and user data in localStorage

const TOKEN_KEY = 'jwtToken';
const USER_ID_KEY = 'userId';

export const storeUserData = (token, userId) => {
  if (typeof window !== 'undefined') { // Ensure localStorage is available (browser environment)
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_ID_KEY, userId);
  }
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_ID_KEY);
  }
  return null;
};

export const removeUserData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }
};

export const isAuthenticated = () => {
  return getToken() !== null;
};