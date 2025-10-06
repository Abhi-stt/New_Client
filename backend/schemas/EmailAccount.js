const mongoose = require('mongoose');

const EmailAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['gmail', 'outlook'], required: true },
  email: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiry: { type: Date, required: true },
  scope: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastSyncAt: { type: Date },
  syncStatus: { type: String, enum: ['active', 'error', 'expired'], default: 'active' },
  errorMessage: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EmailAccount', EmailAccountSchema);
