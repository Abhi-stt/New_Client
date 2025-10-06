const mongoose = require('mongoose');

const SyncedEmailSchema = new mongoose.Schema({
  emailAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailAccount', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Gmail specific fields
  gmailId: { type: String, required: true, unique: true },
  threadId: { type: String },
  
  // Email content
  sender: { type: String, required: true },
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String },
  htmlBody: { type: String },
  textBody: { type: String },
  bodyPreview: { type: String },
  
  // Email metadata
  receivedAt: { type: Date, required: true },
  isRead: { type: Boolean, default: false },
  isImportant: { type: Boolean, default: false },
  hasAttachments: { type: Boolean, default: false },
  attachmentCount: { type: Number, default: 0 },
  
  // Labels and categories
  labels: [{ type: String }],
  category: { type: String }, // AI-generated category
  
  // Forwarding status
  isForwarded: { type: Boolean, default: false },
  forwardedAt: { type: Date },
  forwardingRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailForwardingRule' },
  
}, { timestamps: true });

// Index for efficient queries
SyncedEmailSchema.index({ userId: 1, receivedAt: -1 });
SyncedEmailSchema.index({ gmailId: 1 });
SyncedEmailSchema.index({ sender: 1 });

module.exports = mongoose.model('SyncedEmail', SyncedEmailSchema);
