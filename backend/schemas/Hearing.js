const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    category: { type: String, default: 'note' },
    filename: { type: String },
    originalName: { type: String },
    url: { type: String },
    size: { type: Number },
    mimetype: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const HearingSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    caseTitle: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientSnapshot: {
      name: String,
      email: String,
      phone: String,
    },
    hearingDate: { type: Date, required: true },
    hearingType: { type: String, enum: ['physical', 'online'], default: 'physical' },
    officerName: { type: String },
    benchName: { type: String },
    purpose: { type: String },
    outcome: {
      type: String,
      enum: ['adjourned', 'clarification_required', 'submission_pending', 'completed', 'order_received'],
      default: 'submission_pending',
    },
    notes: { type: String },
    nextHearingDate: { type: Date },
    attachments: [AttachmentSchema],
    reminderChannels: { type: [String], default: ['email'] },
    remindBeforeDays: { type: Number, default: 1 },
    lastReminderSentForDate: { type: Date },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

HearingSchema.index({ adminId: 1, hearingDate: 1 });
HearingSchema.index({ caseId: 1, hearingDate: 1 });

module.exports = mongoose.model('Hearing', HearingSchema);

