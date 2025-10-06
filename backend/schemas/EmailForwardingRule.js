const mongoose = require('mongoose');

const EmailForwardingRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ruleName: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  
  // Conditions
  conditions: {
    senderEmail: { type: String }, // Exact email match
    senderDomain: { type: String }, // Domain match like @gst.gov.in
    subjectKeywords: [{ type: String }], // Keywords in subject
    bodyKeywords: [{ type: String }], // Keywords in body
    hasAttachments: { type: Boolean },
  },
  
  // Actions
  actions: {
    forwardType: { type: String, enum: ['full', 'summary'], default: 'full' },
    recipients: [{
      type: { type: String, enum: ['role', 'email'], required: true },
      value: { type: String, required: true }, // Role name or email address
    }],
    addNote: { type: String }, // Optional note to add to forwarded email
  },
  
  // Statistics
  executionCount: { type: Number, default: 0 },
  lastExecutedAt: { type: Date },
  
}, { timestamps: true });

module.exports = mongoose.model('EmailForwardingRule', EmailForwardingRuleSchema);
