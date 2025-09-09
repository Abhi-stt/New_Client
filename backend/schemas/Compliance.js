const mongoose = require('mongoose');

const ComplianceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  category: { 
    type: String, 
    enum: ['tax', 'gst', 'tds', 'pf', 'esi', 'audit', 'legal', 'other'], 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['recurring', 'one-time', 'annual', 'quarterly', 'monthly', 'weekly'], 
    required: true 
  },
  frequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annually', 'annually'], 
    required: true 
  },
  dueDate: { type: Date, required: true },
  nextDueDate: { type: Date },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'], 
    default: 'pending' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Recurring compliance settings
  isRecurring: { type: Boolean, default: false },
  recurrenceInterval: { type: Number, default: 1 }, // Every X periods
  recurrenceEndDate: { type: Date }, // Optional end date for recurrence
  recurrenceCount: { type: Number }, // Optional max number of occurrences
  
  // Compliance specific fields
  regulatoryBody: { type: String }, // e.g., "Income Tax Department", "GST Department"
  formNumber: { type: String }, // e.g., "GSTR-1", "ITR-1"
  penaltyAmount: { type: Number, default: 0 },
  lateFeeAmount: { type: Number, default: 0 },
  
  // Completion tracking
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completionNotes: { type: String },
  attachments: [{
    filename: { type: String },
    url: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Reminder settings
  reminderDays: [{ type: Number }], // Days before due date to send reminders
  lastReminderSent: { type: Date },
  reminderCount: { type: Number, default: 0 },
  
  // Metadata
  tags: [{ type: String }],
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes for better query performance
ComplianceSchema.index({ clientId: 1, status: 1 });
ComplianceSchema.index({ clientId: 1, dueDate: 1 });
ComplianceSchema.index({ clientId: 1, category: 1 });
ComplianceSchema.index({ assignedTo: 1, status: 1 });
ComplianceSchema.index({ isRecurring: 1, nextDueDate: 1 });

// Virtual for calculating days until due
ComplianceSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for calculating days overdue
ComplianceSchema.virtual('daysOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return 0;
  const today = new Date();
  const due = new Date(this.dueDate);
  if (today > due) {
    const diffTime = today - due;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Method to check if compliance is overdue
ComplianceSchema.methods.isOverdue = function() {
  return this.dueDate && new Date() > this.dueDate && this.status !== 'completed';
};

// Method to calculate next due date for recurring compliance
ComplianceSchema.methods.calculateNextDueDate = function() {
  if (!this.isRecurring || !this.frequency) return null;
  
  const currentDue = new Date(this.dueDate);
  let nextDue = new Date(currentDue);
  
  switch (this.frequency) {
    case 'daily':
      nextDue.setDate(currentDue.getDate() + this.recurrenceInterval);
      break;
    case 'weekly':
      nextDue.setDate(currentDue.getDate() + (7 * this.recurrenceInterval));
      break;
    case 'monthly':
      nextDue.setMonth(currentDue.getMonth() + this.recurrenceInterval);
      break;
    case 'quarterly':
      nextDue.setMonth(currentDue.getMonth() + (3 * this.recurrenceInterval));
      break;
    case 'semi-annually':
      nextDue.setMonth(currentDue.getMonth() + (6 * this.recurrenceInterval));
      break;
    case 'annually':
      nextDue.setFullYear(currentDue.getFullYear() + this.recurrenceInterval);
      break;
  }
  
  return nextDue;
};

module.exports = mongoose.model('Compliance', ComplianceSchema);
