// ai-chatbot-backend/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); // Corrected import path
const chatRoutes = require('./routes/chatRoutes');
const errorHandler = require('./middleware/errorHandler'); // Custom error handling middleware

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbot';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
// Enable CORS for all origins, allowing frontend to make requests.
// In a production environment, you would restrict this to specific origins.
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json()); // Body parser for JSON requests

// Routes
// Authentication routes
app.use('/api/auth', authRoutes);
// Chat-related routes, protected by authentication middleware
app.use('/api/chat', chatRoutes);

// Basic route for testing server
app.get('/', (req, res) => {
  res.send('AI Chatbot Backend API is running!');
});

// Global error handling middleware. This should be the last middleware added.
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});