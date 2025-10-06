const mongoose = require('mongoose');

const EmailAuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { 
    type: String, 
    enum: ['connect', 'disconnect', 'sync', 'forward', 'read', 'reply', 'rule_created', 'rule_updated', 'rule_deleted'],
    required: true 
  },
  emailAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailAccount' },
  emailId: { type: mongoose.Schema.Types.ObjectId, ref: 'SyncedEmail' },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailForwardingRule' },
  
  // Action details
  details: {
    from: { type: String },
    to: { type: String },
    subject: { type: String },
    ruleName: { type: String },
    errorMessage: { type: String },
  },
  
  ipAddress: { type: String },
  userAgent: { type: String },
  
}, { timestamps: true });

module.exports = mongoose.model('EmailAuditLog', EmailAuditLogSchema);
