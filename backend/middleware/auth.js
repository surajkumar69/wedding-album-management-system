const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretweddingtokenshowmustgoon';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token, access denied.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found, authentication failed.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is invalid or expired.', error: err.message });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
