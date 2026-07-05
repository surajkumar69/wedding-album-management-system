const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const UserModel = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretweddingtokenshowmustgoon';

// Helper to generate token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
};

// Registration handler
const registerHandler = async (req, res) => {
  const { email, phone, password, confirmPassword } = req.body;

  try {
    // Validation
    if (!email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check if user exists
    let user = await UserModel.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Create user
    let hashedPassword = password;
    if (typeof UserModel.create === 'function' && UserModel.filePath) {
      // JSON db doesn't run Mongoose pre-save middleware
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const newUser = await UserModel.create({
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      status: 'active'
    });

    // Auto-login: generate token
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status
      }
    });

  } catch (err) {
    console.error('Signup/Register error:', err.message);
    res.status(500).json({ message: 'Server error during registration.', error: err.message });
  }
};

// @route   POST api/auth/signup
// @desc    Register a new photographer / user (signup alias)
router.post('/signup', registerHandler);

// @route   POST api/auth/register
// @desc    Register a new photographer / user (register alias)
router.post('/register', registerHandler);

// @route   POST api/auth/login
// @desc    Authenticate user (admin/user) & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all credentials.' });
    }

    // Predefined admin or database search
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked by the administrator.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
});

// @route   GET api/auth/me
// @desc    Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      status: req.user.status
    }
  });
});

// @route   PUT api/auth/profile
// @desc    Update photographer profile (Studio Owner details)
router.put('/profile', authMiddleware, async (req, res) => {
  const { studioName, ownerName, phone, password } = req.body;
  const updateData = {};

  if (phone) updateData.phone = phone;
  
  // Custom properties for JSON DB or extra metadata for photographer
  if (studioName) updateData.studioName = studioName;
  if (ownerName) updateData.ownerName = ownerName;

  try {
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    );

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status
      }
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ message: 'Server error during profile update.' });
  }
});

module.exports = router;
