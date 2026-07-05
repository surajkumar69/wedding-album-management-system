const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const PhotoSelectionModel = require('../models/PhotoSelection');
const UserModel = require('../models/User');
const { uploadToStorage } = require('../config/cloudinary');
const { applyWatermark } = require('../middleware/watermark');

const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '../public/uploads/tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 25 * 1024 * 1024 } // limit 25MB per file
});

// @route   GET api/selection/my-selections
// @desc    Get all selection folders uploaded by the photographer
router.get('/my-selections', authMiddleware, async (req, res) => {
  try {
    const selections = await PhotoSelectionModel.find({ ownerId: req.user._id });
    res.json(selections);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving selection folders.' });
  }
});

// @route   GET api/selection/photographer/:id
// @desc    Get complete selection folder status details for photographer (Authenticated)
router.get('/photographer/:id', authMiddleware, async (req, res) => {
  try {
    const selection = await PhotoSelectionModel.findById(req.params.id);
    if (!selection) {
      return res.status(404).json({ message: 'Selection folder not found.' });
    }
    
    // Safety check - must be the owner
    if (selection.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(selection);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching details.' });
  }
});

// @route   POST api/selection/create
// @desc    Create selection project, apply watermarks, and upload images
router.post('/create', authMiddleware, upload.array('photos', 2000), async (req, res) => {
  const { title, studioName } = req.body;

  // Set timeout to 10 minutes to prevent premature gateway drops on large uploads
  req.setTimeout(600000);
  res.setTimeout(600000);

  try {
    if (!title) {
      return res.status(400).json({ message: 'Folder title is required.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one photo.' });
    }

    console.log(`Processing folder upload: "${title}" with ${req.files.length} images.`);
    
    const photosData = [];
    const watermarkText = studioName || 'Rahul Sankhala Studio';

    // Process images in concurrent batches of 10 to speed up watermarking/disk write without OOM crashes
    const BATCH_SIZE = 10;
    for (let i = 0; i < req.files.length; i += BATCH_SIZE) {
      const batch = req.files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        console.log(`Watermarking and uploading: ${file.originalname}`);
        
        // Read file buffer from temporary disk path
        const fileBuffer = fs.readFileSync(file.path);
        
        // 1. Upload original photo
        const originalUrl = await uploadToStorage(
          fileBuffer,
          'selections_original',
          file.originalname
        );

        // 2. Generate and upload watermarked photo
        const watermarkedBuffer = await applyWatermark(fileBuffer, watermarkText);
        const watermarkedUrl = await uploadToStorage(
          watermarkedBuffer,
          'selections_watermarked',
          `watermarked_${file.originalname}`
        );

        photosData.push({
          _id: 'photo_' + Math.random().toString(36).substring(2, 11),
          name: file.originalname,
          url: originalUrl, // Photographer only
          watermarkedUrl: watermarkedUrl, // Served to client
          status: 'pending'
        });

        // Clean up temp file from disk
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error(`Failed to delete temp file ${file.path}:`, unlinkErr.message);
        }
      }));
    }

    const selectionProject = await PhotoSelectionModel.create({
      ownerId: req.user._id,
      title,
      photos: photosData,
      clientOpened: false,
      selectionStarted: false,
      selectionCompleted: false
    });

    res.status(201).json({
      message: 'Selection project uploaded and watermarked successfully!',
      selectionId: selectionProject._id
    });

  } catch (err) {
    console.error('Error creating selection folder:', err.message);
    res.status(500).json({ message: 'Server error during selection setup.', error: err.message });
  }
});

// @route   GET api/selection/client/:id
// @desc    Get secure photos for client (unauthenticated, hide original URLs for security)
router.get('/client/:id', async (req, res) => {
  try {
    const selection = await PhotoSelectionModel.findById(req.params.id);
    if (!selection) {
      return res.status(404).json({ message: 'Selection folder not found.' });
    }

    // Hide original URLs for client security
    const clientPhotos = selection.photos.map(p => ({
      _id: p._id,
      name: p.name,
      url: p.watermarkedUrl, // Client ONLY sees watermarked URL
      status: p.status
    }));

    res.json({
      _id: selection._id,
      title: selection.title,
      clientOpened: selection.clientOpened,
      selectionStarted: selection.selectionStarted,
      selectionCompleted: selection.selectionCompleted,
      photos: clientPhotos,
      ownerId: selection.ownerId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving photos for client.' });
  }
});

// @route   PUT api/selection/:id/client-action
// @desc    Emit client activity triggers (Open, Start selection)
router.put('/client-action/:id', async (req, res) => {
  const { action } = req.body; // 'open', 'start', 'complete'
  
  try {
    const selection = await PhotoSelectionModel.findById(req.params.id);
    if (!selection) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const updateFields = {};
    let notificationMsg = '';

    if (action === 'open') {
      updateFields.clientOpened = true;
      notificationMsg = `Client opened the selection link for "${selection.title}"`;
    } else if (action === 'start') {
      updateFields.selectionStarted = true;
      notificationMsg = `Client started selecting photos for "${selection.title}"`;
    } else if (action === 'complete') {
      updateFields.selectionCompleted = true;
      notificationMsg = `Client completed the selection process for "${selection.title}"!`;
    }

    const updated = await PhotoSelectionModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    // Notify photographer via socket in real time
    if (req.io) {
      req.io.to(selection.ownerId.toString()).emit('clientActivityAlert', {
        selectionId: selection._id,
        title: selection.title,
        action,
        message: notificationMsg,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Action tracked successfully.', status: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating client actions.' });
  }
});

// @route   PUT api/selection/:id/photo/:photoId
// @desc    Toggle image favorite/reject status
router.put('/:id/photo/:photoId', async (req, res) => {
  const { status } = req.body; // 'selected', 'rejected', 'pending'

  try {
    const selection = await PhotoSelectionModel.findById(req.params.id);
    if (!selection) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    console.log('Toggle Photo Status Debug:');
    console.log('photoId requested:', req.params.photoId);
    console.log('Photos array:', JSON.stringify(selection.photos, null, 2));

    let targetPhotoName = '';
    const updatedPhotos = selection.photos.map(p => {
      if (p._id.toString() === req.params.photoId.toString()) {
        targetPhotoName = p.name;
        return {
          ...p,
          status,
          selectionTime: status === 'selected' ? new Date() : p.selectionTime,
          rejectedTime: status === 'rejected' ? new Date() : p.rejectedTime
        };
      }
      return p;
    });

    const updated = await PhotoSelectionModel.findByIdAndUpdate(
      req.params.id,
      { $set: { photos: updatedPhotos } },
      { new: true }
    );

    // Dynamic notification messages
    let socketMsg = '';
    if (status === 'selected') {
      socketMsg = `Selected photo "${targetPhotoName}"`;
    } else if (status === 'rejected') {
      socketMsg = `Rejected photo "${targetPhotoName}"`;
    } else {
      socketMsg = `Reset review for "${targetPhotoName}"`;
    }

    // Emit live stats update
    if (req.io) {
      const stats = {
        total: updated.photos.length,
        selected: updated.photos.filter(p => p.status === 'selected').length,
        rejected: updated.photos.filter(p => p.status === 'rejected').length,
        pending: updated.photos.filter(p => p.status === 'pending').length
      };

      req.io.to(selection.ownerId.toString()).emit('selectionStatsUpdate', {
        selectionId: selection._id,
        title: selection.title,
        stats,
        message: socketMsg,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Photo review saved.', photos: updated.photos });
  } catch (err) {
    console.error('Error toggling photo review:', err.message);
    res.status(500).json({ message: 'Error saving photo review status.' });
  }
});

module.exports = router;
