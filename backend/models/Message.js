// models/Message.js
// Mongoose model for Message schema.
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId, // Link to the Conversation model
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: String, // 'user' or 'ai'
    required: true,
    enum: ['user', 'ai'] // Restrict sender to these two values
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);