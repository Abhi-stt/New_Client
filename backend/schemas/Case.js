const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
  {
    category: { type: String, default: 'other' },
    label: { type: String },
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

const TimelineEntrySchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: ['case_created', 'notice', 'reply', 'evidence', 'order', 'hearing', 'submission', 'update'],
      default: 'update',
    },
    title: { type: String },
    description: { type: String },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    linkedHearing: { type: mongoose.Schema.Types.ObjectId, ref: 'Hearing' },
    files: [FileSchema],
  },
  { _id: false }
);

const CaseSchema = new mongoose.Schema(
  {
    caseTitle: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    clientSnapshot: {
      name: String,
      email: String,
      phone: String,
    },
    caseType: { type: String, required: true },
    caseCategory: { type: String },
    caseNumber: { type: String },
    authorityName: { type: String },
    authorityType: { type: String },
    officerName: { type: String },
    officeAddress: { type: String },
    departmentRequirement: { type: String },
    startDate: { type: Date },
    dueDate: { type: Date },
    replyDueDate: { type: Date },
    nextHearingDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'submitted', 'closed'],
      default: 'pending',
    },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamAssignments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'support' },
      },
    ],
    documents: [FileSchema],
    internalNotes: { type: String },
    tags: [{ type: String }],
    reminderPreferences: {
      channels: { type: [String], default: ['email'] },
      daysBeforeHearing: { type: Number, default: 1 },
      daysBeforeDue: { type: Number, default: 3 },
      daysBeforeReply: { type: Number, default: 2 },
      notifyClient: { type: Boolean, default: true },
      notifyTeam: { type: Boolean, default: true },
    },
    reminderLogs: [
      {
        type: { type: String },
        channel: { type: String },
        sentAt: { type: Date, default: Date.now },
        status: { type: String },
        message: { type: String },
      },
    ],
    lastSubmissionReminderForDate: { type: Date },
    lastReplyReminderForDate: { type: Date },
    noticeAlertStatus: {
      type: String,
      enum: ['none', 'pending', 'acknowledged', 'closed'],
      default: 'none',
    },
    submissionAlertStatus: {
      type: String,
      enum: ['none', 'pending', 'sent', 'closed'],
      default: 'none',
    },
    timeline: [TimelineEntrySchema],
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CaseSchema.index({ adminId: 1, status: 1 });
CaseSchema.index({ clientId: 1, status: 1 });
CaseSchema.index({ caseType: 1, status: 1 });

module.exports = mongoose.model('Case', CaseSchema);

