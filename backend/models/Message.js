const mongoose = require('mongoose');
const { USE_MONGODB, JSONModel } = require('../config/db');

let MessageModel;

if (USE_MONGODB) {
  const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true }, // can be Admin or User ID
    receiverId: { type: String, required: true },
    content: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });

  MessageModel = mongoose.model('Message', MessageSchema);
} else {
  MessageModel = new JSONModel('messages');
}

module.exports = MessageModel;
