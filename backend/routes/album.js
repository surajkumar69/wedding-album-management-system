const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const AlbumModel = require('../models/Album');
const ServiceModel = require('../models/Service');
const { uploadToStorage } = require('../config/cloudinary');

const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '../public/uploads/tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 25 * 1024 * 1024 } // limit 25MB
});

const cpUpload = upload.fields([
  { name: 'frontCover', maxCount: 1 },
  { name: 'backCover', maxCount: 1 },
  { name: 'sheets', maxCount: 200 },
  { name: 'customSong', maxCount: 1 }
]);

// Helper for default songs
const WEBSITE_SONGS = [
  { id: 'song_1', name: 'Romantic Piano & Strings (Instrumental)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'song_2', name: 'Traditional Divine Shehnai', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'song_3', name: 'Classic Bridal Wedding March', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
];

// @route   GET api/album/services
// @desc    Get only active (non-hidden) services for user dashboard
router.get('/services', authMiddleware, async (req, res) => {
  try {
    const services = await ServiceModel.find({ hidden: false });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching services.' });
  }
});

// @route   GET api/album/songs
// @desc    Get pre-defined website wedding songs
router.get('/songs', authMiddleware, async (req, res) => {
  res.json(WEBSITE_SONGS);
});

// @route   GET api/album/my-albums
// @desc    Get current user's created albums
router.get('/my-albums', authMiddleware, async (req, res) => {
  try {
    const albums = await AlbumModel.find({ ownerId: req.user._id });
    res.json(albums);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving your albums.' });
  }
});

// @route   POST api/album/create
// @desc    Create a wedding album flipbook
router.post('/create', authMiddleware, cpUpload, async (req, res) => {
  const {
    studioOwnerName,
    studioName,
    mobileNumber,
    gmail,
    instagramId,
    songType, // 'website' or 'upload'
    selectedSongId,
    clientName,
    brideName,
    groomName,
    eventDate,
    albumTitle
  } = req.body;

  try {
    // Validate covers
    if (!req.files || !req.files.frontCover || !req.files.backCover) {
      return res.status(400).json({ message: 'Front cover and back cover are required.' });
    }

    if (!req.files.sheets || req.files.sheets.length === 0) {
      return res.status(400).json({ message: 'At least one album sheet is required.' });
    }

    console.log('Uploading covers...');
    // Upload covers
    const frontCoverBuffer = fs.readFileSync(req.files.frontCover[0].path);
    const frontCoverUrl = await uploadToStorage(
      frontCoverBuffer,
      'albums',
      req.files.frontCover[0].originalname
    );
    try { fs.unlinkSync(req.files.frontCover[0].path); } catch (e) {}

    const backCoverBuffer = fs.readFileSync(req.files.backCover[0].path);
    const backCoverUrl = await uploadToStorage(
      backCoverBuffer,
      'albums',
      req.files.backCover[0].originalname
    );
    try { fs.unlinkSync(req.files.backCover[0].path); } catch (e) {}

    console.log('Uploading album sheets...');
    // Upload sheets
    const sheetsUrls = [];
    for (let sheet of req.files.sheets) {
      const sheetBuffer = fs.readFileSync(sheet.path);
      const sheetUrl = await uploadToStorage(
        sheetBuffer,
        'albums',
        sheet.originalname
      );
      sheetsUrls.push(sheetUrl);
      try { fs.unlinkSync(sheet.path); } catch (e) {}
    }

    // Determine Song URL
    let songUrl = '';
    if (songType === 'website') {
      const chosen = WEBSITE_SONGS.find(s => s.id === selectedSongId);
      songUrl = chosen ? chosen.url : WEBSITE_SONGS[0].url;
    } else if (songType === 'upload' && req.files.customSong) {
      console.log('Uploading custom MP3 song...');
      const songBuffer = fs.readFileSync(req.files.customSong[0].path);
      songUrl = await uploadToStorage(
        songBuffer,
        'songs',
        req.files.customSong[0].originalname
      );
      try { fs.unlinkSync(req.files.customSong[0].path); } catch (e) {}
    }

    // Save album record first to obtain an ID
    const newAlbum = await AlbumModel.create({
      ownerId: req.user._id,
      studioOwnerName: studioOwnerName || 'Rahul Sankhala',
      studioName: studioName || 'Rahul Sankhala Studio',
      mobileNumber: mobileNumber || '6376005694',
      gmail: gmail || 'rahulsankhala1098@gmail.com',
      instagramId: instagramId || '',
      clientName: clientName || '',
      brideName: brideName || '',
      groomName: groomName || '',
      eventDate: eventDate || '',
      albumTitle: albumTitle || '',
      frontCover: frontCoverUrl,
      backCover: backCoverUrl,
      sheets: sheetsUrls,
      songType,
      songUrl
    });

    // Build Secure Album URL pointing to the frontend viewer
    // We will dynamicize the base URL based on Referer or default to standard client port
    const origin = req.get('referer') ? new URL(req.get('referer')).origin : 'http://localhost:5173';
    const albumUrl = `${origin}/viewer/${newAlbum._id}`;
    
    // Generate QR Code using the free secure QR Server API
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(albumUrl)}`;

    // Update with URLs
    const updatedAlbum = await AlbumModel.findByIdAndUpdate(
      newAlbum._id,
      { $set: { albumUrl, qrCode } },
      { new: true }
    );

    res.status(201).json({
      message: 'Wedding Album created successfully!',
      album: updatedAlbum
    });

  } catch (err) {
    console.error('Error creating album:', err.message);
    res.status(500).json({ message: 'Server error during album creation.', error: err.message });
  }
});

// @route   GET api/album/viewer/:id
// @desc    Get album details for public flipbook viewer (No Authentication needed)
router.get('/viewer/:id', async (req, res) => {
  try {
    const album = await AlbumModel.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found.' });
    }
    res.json(album);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving album details.' });
  }
});

module.exports = router;
