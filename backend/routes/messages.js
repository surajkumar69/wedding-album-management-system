const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const MessageModel = require('../models/Message');
const UserModel = require('../models/User');
const { uploadToStorage } = require('../config/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // limit 10MB
});

// Helper: check if message involves current user (unless admin)
const checkAccess = (req, targetUserId) => {
  return req.user.role === 'admin' || req.user._id.toString() === targetUserId;
};

// @route   GET api/messages/admin/chats
// @desc    Get list of all users and their latest message status for admin inbox
router.get('/admin/chats', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  try {
    const users = await UserModel.find({ role: 'user' });
    const chatsSummary = [];

    for (let u of users) {
      // Find all messages between admin and this user
      const msgs = await MessageModel.find({
        $or: [
          { senderId: 'admin', receiverId: u._id.toString() },
          { senderId: u._id.toString(), receiverId: 'admin' }
        ]
      });

      // Sort by date (mock JSON find doesn't guarantee sorting)
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const unreadCount = msgs.filter(m => m.senderId === u._id.toString() && !m.read).length;
      const latestMsg = msgs[msgs.length - 1] || null;

      chatsSummary.push({
        userId: u._id || u.id,
        email: u.email,
        phone: u.phone,
        status: u.status,
        latestMessage: latestMsg ? latestMsg.content : '',
        latestFile: latestMsg && latestMsg.fileUrl ? latestMsg.fileName : null,
        unreadCount,
        lastActive: latestMsg ? latestMsg.createdAt : u.createdAt
      });
    }

    // Sort by latest message/activity first
    chatsSummary.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    res.json(chatsSummary);

  } catch (err) {
    res.status(500).json({ message: 'Error retrieving chat lists.' });
  }
});

// @route   GET api/messages/history/:userId
// @desc    Retrieve chat messages between user and admin
router.get('/history/:userId', authMiddleware, async (req, res) => {
  const targetUserId = req.params.userId;

  if (!checkAccess(req, targetUserId)) {
    return res.status(403).json({ message: 'Unauthorized to view this history.' });
  }

  try {
    const messages = await MessageModel.find({
      $or: [
        { senderId: 'admin', receiverId: targetUserId },
        { senderId: targetUserId, receiverId: 'admin' }
      ]
    });

    // Mark received messages as read
    // If the requester is admin, mark user messages as read. If user, mark admin messages as read.
    const receiverIsAdmin = req.user.role === 'admin';
    const targetSenderId = receiverIsAdmin ? targetUserId : 'admin';

    for (let m of messages) {
      if (m.senderId === targetSenderId && !m.read) {
        await MessageModel.findByIdAndUpdate(m._id, { $set: { read: true } });
      }
    }

    // Sort and return
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(messages);

  } catch (err) {
    console.error('Error fetching chat history:', err.message);
    res.status(500).json({ message: 'Error pulling chat logs.' });
  }
});

// @route   POST api/messages/send
// @desc    Send a message, supporting attachments
router.post('/send', authMiddleware, upload.single('attachment'), async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user.role === 'admin' ? 'admin' : req.user._id.toString();

  try {
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required.' });
    }

    let fileUrl = '';
    let fileName = '';
    let fileType = '';

    if (req.file) {
      console.log('Uploading chat attachment:', req.file.originalname);
      fileUrl = await uploadToStorage(
        req.file.buffer,
        'chats',
        req.file.originalname
      );
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }

    const message = await MessageModel.create({
      senderId,
      receiverId,
      content: content || '',
      fileUrl,
      fileName,
      fileType,
      read: false
    });

    // Live socket emit
    if (req.io) {
      const socketTarget = receiverId === 'admin' ? 'admin' : receiverId;
      req.io.to(socketTarget).emit('newMessage', message);
    }

    res.status(201).json(message);

  } catch (err) {
    console.error('Error sending message:', err.message);
    res.status(500).json({ message: 'Error delivering message.' });
  }
});

module.exports = router;
