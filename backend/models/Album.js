const mongoose = require('mongoose');
const { USE_MONGODB, JSONModel } = require('../config/db');

let AlbumModel;

if (USE_MONGODB) {
  const AlbumSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studioOwnerName: { type: String, required: true },
    studioName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    gmail: { type: String, required: true },
    instagramId: { type: String },
    clientName: { type: String, default: '' },
    brideName: { type: String, default: '' },
    groomName: { type: String, default: '' },
    eventDate: { type: String, default: '' },
    albumTitle: { type: String, default: '' },
    frontCover: { type: String, required: true },
    backCover: { type: String, required: true },
    sheets: [{ type: String }],
    songType: { type: String, enum: ['website', 'upload'], default: 'website' },
    songUrl: { type: String },
    albumUrl: { type: String },
    qrCode: { type: String }, // Base64 or image path/URL
    createdAt: { type: Date, default: Date.now }
  });

  AlbumModel = mongoose.model('Album', AlbumSchema);
} else {
  AlbumModel = new JSONModel('albums');
}

module.exports = AlbumModel;
