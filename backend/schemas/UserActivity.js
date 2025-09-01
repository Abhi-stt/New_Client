const mongoose = require('mongoose');

const UserActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // login, logout, create_user, update_user, etc.
  description: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data like affected user, changes made, etc.
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for efficient querying
UserActivitySchema.index({ userId: 1, timestamp: -1 });
UserActivitySchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('UserActivity', UserActivitySchema);

