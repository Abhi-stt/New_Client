const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['GST Return', 'ITR', 'Bank Statement', 'Invoice', 'TDS Certificate', 'Other'], required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId },
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'synced'], default: 'pending' },
  syncWithGoogleSheets: { type: Boolean, default: false },
  syncWithSharePoint: { type: Boolean, default: false },
  googleSheetsUrl: { type: String },
  sharePointUrl: { type: String },
  files: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema); 