process.on('uncaughtException', (err) => {
  console.error(err);
});

process.on('unhandledRejection', (err) => {
  console.error(err);
});


const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectDB } = require('./config/db');

// Initialize database
connectDB();

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: (origin, callback) => {
    // Reflect the request origin back to support credentials on any local hostname/port
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files locally
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Socket.io Real-time Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Cache online status
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Client connected to Socket.io:', socket.id);

  // User identifies/authenticates self on socket
  socket.on('identify', (userId) => {
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    
    // Join room for custom private messages
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);

    // Broadcast updated online list
    io.emit('onlineList', Array.from(onlineUsers.keys()));
  });

  // Typing state relays
  socket.on('typing', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('typingState', { senderId, isTyping: true });
  });

  socket.on('stopTyping', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('typingState', { senderId, isTyping: false });
  });

  // Disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
      io.emit('onlineList', Array.from(onlineUsers.keys()));
    }
  });
});

// Middleware to inject socket.io into request context
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/album', require('./routes/album'));
app.use('/api/selection', require('./routes/selection'));
app.use('/api/messages', require('./routes/messages'));

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Wedding Album Management SaaS API is running.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server executing successfully on port ${PORT}`);
});
