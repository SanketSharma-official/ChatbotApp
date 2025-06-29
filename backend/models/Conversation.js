// models/Conversation.js
// Mongoose model for Conversation schema.
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Link to the User model
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'New Chat' // Default title for new conversations
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now // Useful for sorting conversations by recent activity
  }
});

// Update `updatedAt` field on every save
ConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', ConversationSchema);