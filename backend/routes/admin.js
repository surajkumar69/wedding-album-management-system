const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const UserModel = require('../models/User');
const ServiceModel = require('../models/Service');
const AlbumModel = require('../models/Album');
const PhotoSelectionModel = require('../models/PhotoSelection');

// Apply auth and admin middleware to all routes here
router.use(authMiddleware);
router.use(adminMiddleware);

// @route   GET api/admin/stats
// @desc    Get dashboard metrics summary
router.get('/stats', async (req, res) => {
  try {
    const users = await UserModel.find({ role: 'user' });
    const albums = await AlbumModel.find({});
    const selections = await PhotoSelectionModel.find({});
    const services = await ServiceModel.find({});

    const totalUsers = users.length;
    const totalAlbums = albums.length;
    const totalSelections = selections.length;
    
    // Count photo selection stats
    let totalPhotos = 0;
    let totalSelected = 0;
    let totalRejected = 0;
    let totalPending = 0;

    selections.forEach(sel => {
      if (sel.photos) {
        totalPhotos += sel.photos.length;
        totalSelected += sel.photos.filter(p => p.status === 'selected').length;
        totalRejected += sel.photos.filter(p => p.status === 'rejected').length;
        totalPending += sel.photos.filter(p => p.status === 'pending').length;
      }
    });

    res.json({
      totalUsers,
      totalAlbums,
      totalSelections,
      photoStats: {
        totalPhotos,
        totalSelected,
        totalRejected,
        totalPending
      },
      services: services.map(s => ({
        id: s._id,
        name: s.name,
        hidden: s.hidden
      }))
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ message: 'Server error pulling admin dashboard metrics.' });
  }
});

// @route   GET api/admin/users
// @desc    Get list of all registered users
router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.find({ role: 'user' });
    res.json(users.map(u => ({
      id: u._id || u.id,
      email: u.email,
      phone: u.phone,
      status: u.status,
      createdAt: u.createdAt
    })));
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving user accounts.' });
  }
});

// @route   PUT api/admin/users/:id/toggle-block
// @desc    Block or unblock a user
router.put('/users/:id/toggle-block', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: newStatus } },
      { new: true }
    );

    res.json({
      message: `User status changed to ${newStatus}.`,
      user: {
        id: updatedUser._id || updatedUser.id,
        email: updatedUser.email,
        status: updatedUser.status
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error changing user status.' });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

// @route   GET api/admin/services
// @desc    Get all predefined services for admin management
router.get('/services', async (req, res) => {
  try {
    const services = await ServiceModel.find({});
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving services.' });
  }
});

// @route   PUT api/admin/services/:id/toggle-visibility
// @desc    Hide or show a service
router.put('/services/:id/toggle-visibility', async (req, res) => {
  try {
    const service = await ServiceModel.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    const updatedService = await ServiceModel.findByIdAndUpdate(
      req.params.id,
      { $set: { hidden: !service.hidden } },
      { new: true }
    );

    res.json({
      message: `Service visibility toggled. Hidden is now: ${updatedService.hidden}`,
      service: updatedService
    });
  } catch (err) {
    res.status(500).json({ message: 'Error toggling service visibility.' });
  }
});

// @route   GET api/admin/albums
// @desc    Get all created albums in the platform
router.get('/albums', async (req, res) => {
  try {
    const albums = await AlbumModel.find({});
    res.json(albums);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving platform albums.' });
  }
});

// @route   GET api/admin/selections
// @desc    Get all client selections / proofing links
router.get('/selections', async (req, res) => {
  try {
    const selections = await PhotoSelectionModel.find({});
    res.json(selections);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving platform selection links.' });
  }
});

module.exports = router;
