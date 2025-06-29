// ai-chatbot-backend/routes/chatRoutes.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware.js');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodeFetch = require('node-fetch');

// Make node-fetch globally available
if (typeof global.fetch === 'undefined') {
  global.fetch = nodeFetch;
  console.log('node-fetch has been set as global.fetch for GoogleGenerativeAI.');
} else {
  console.log('global.fetch is already defined.');
}

// Initialize Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI;
let model;

if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
  console.error('CRITICAL ERROR: GEMINI_API_KEY is not defined or is empty.');
} else {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Google Generative AI model initialized successfully.');
  } catch (initErr) {
    console.error('Error initializing Google Generative AI model:', initErr.message);
  }
}

// GET all conversations for a user
router.get('/conversations/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied. User ID mismatch.' });
    }

    const conversations = await Conversation.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST create new conversation
router.post('/conversations/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied. User ID mismatch.' });
    }

    const newConversation = new Conversation({
      userId: req.params.userId,
      title: req.body.title || 'New Chat',
    });

    const conversation = await newConversation.save();
    res.status(201).json(conversation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT update conversation title
router.put('/conversations/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title cannot be empty.' });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId: req.user.id },
      { $set: { title: title.trim() } },
      { new: true, runValidators: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or unauthorized.' });
    }

    res.json(conversation);
  } catch (err) {
    console.error('Error updating conversation:', err.message);
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Conversation ID format.' });
    }
    res.status(500).send('Server Error');
  }
});

// GET all messages for a conversation
router.get('/messages/:conversationId', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. Not your conversation.' });
    }

    const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST send new message and get AI response
router.post('/messages/:conversationId', authMiddleware, async (req, res) => {
  const { message } = req.body;
  const { conversationId } = req.params;

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. Not your conversation.' });
    }

    const userMessage = new Message({
      conversationId,
      sender: 'user',
      content: message,
    });
    await userMessage.save();

    const allPreviousMessages = await Message.find({
      conversationId,
      _id: { $ne: userMessage._id },
    }).sort({ createdAt: 1 });

    const MAX_CONTEXT_MESSAGES = 20;
    const recentPreviousMessages = allPreviousMessages.slice(Math.max(0, allPreviousMessages.length - MAX_CONTEXT_MESSAGES));

    const formattedHistory = recentPreviousMessages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    let aiResponseText = 'I am currently unable to generate a response. Please try again.';

    if (!model) {
      aiResponseText = 'AI service is not configured. Please ensure the API key is set.';
    } else {
      try {
        const chat = model.startChat({
          history: formattedHistory,
          generationConfig: { maxOutputTokens: 800 },
        });

        const result = await chat.sendMessage(message);
        aiResponseText = result.response.text();

        if (!aiResponseText || aiResponseText.trim() === '') {
          aiResponseText = 'I received an empty response from the AI. Please try again.';
        }
      } catch (geminiErr) {
        console.error('Error during Gemini API call:', geminiErr);
        aiResponseText = `I encountered an issue connecting to the AI. Please try again. Details: ${geminiErr.message}`;
        if (geminiErr.message.includes('Error fetching from link') || geminiErr.message.includes('Invalid API key')) {
          aiResponseText = 'Issue with AI service. Please check your API key.';
        }
      }
    }

    const aiMessage = new Message({
      conversationId,
      sender: 'ai',
      content: aiResponseText,
    });
    await aiMessage.save();

    const updatedMessages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.status(201).json({ messages: updatedMessages });
  } catch (err) {
    console.error('Error in sendMessage route:', err.message);
    res.status(500).json({ message: 'Server Error processing message', error: err.message });
  }
});

module.exports = router;
