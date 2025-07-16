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
  syncStatus: { type: String, enum: ['pending', 'synced', 'error', 'offline'], default: 'pending' },
  lastSyncedAt: { type: Date },
  files: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  // Notification and secure upload fields
  uploadLinkToken: { type: String },
  uploadLinkExpiresAt: { type: Date },
  uploadLinkUsed: { type: Boolean, default: false },
  reminderCount: { type: Number, default: 0 },
  reminderLimit: { type: Number, default: 3 },
  dueDate: { type: Date },
  clientEmail: { type: String },
  confidential: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema); 