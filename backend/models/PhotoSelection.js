const mongoose = require('mongoose');
const { USE_MONGODB, JSONModel } = require('../config/db');

let PhotoSelectionModel;

if (USE_MONGODB) {
  const PhotoSelectionSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    photos: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      watermarkedUrl: { type: String, required: true },
      status: { type: String, enum: ['selected', 'rejected', 'pending'], default: 'pending' },
      selectionTime: { type: Date },
      rejectedTime: { type: Date }
    }],
    clientOpened: { type: Boolean, default: false },
    selectionStarted: { type: Boolean, default: false },
    selectionCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });

  PhotoSelectionModel = mongoose.model('PhotoSelection', PhotoSelectionSchema);
} else {
  PhotoSelectionModel = new JSONModel('photoSelections');
}

module.exports = PhotoSelectionModel;
