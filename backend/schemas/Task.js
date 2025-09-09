const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, // Link to service if created from service
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'review', 'approved', 'cancelled'], default: 'pending' },
  isRecurring: { type: Boolean, default: false },
  recurrenceType: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  recurrenceInterval: { type: Number, default: 1 }, // Every X days/weeks/months/years
  recurrenceEndDate: { type: Date }, // Optional end date for recurrence
  recurrenceCount: { type: Number }, // Optional max number of occurrences
  recurrenceDaysOfWeek: [{ type: Number, min: 0, max: 6 }], // For weekly recurrence (0=Sunday, 6=Saturday)
  recurrenceDayOfMonth: { type: Number, min: 1, max: 31 }, // For monthly recurrence
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin domain this task belongs to
  
  // Reassignment fields
  reassignedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Previous assignee
  reassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who reassigned the task
  reassignedAt: { type: Date }, // When it was reassigned
  reassignmentHistory: [{ // Track all reassignments
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reassignedAt: { type: Date, default: Date.now },
    reason: { type: String }
  }],
  
  // Review workflow fields
  reviewTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // Link to review task
  originalTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // Link to original task (for review tasks)
  completionNotes: { type: String }, // Notes when task is completed
  reviewNotes: { type: String }, // Notes from reviewer
  completedAt: { type: Date }, // When task was completed
  reviewedAt: { type: Date }, // When task was reviewed
  
  // Additional metadata
  estimatedHours: { type: Number },
  actualHours: { type: Number },
  tags: [{ type: String }], // For categorization
  attachments: [{ 
    filename: { type: String },
    url: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Progress tracking fields
  currentProgress: { type: Number, min: 0, max: 100, default: 0 }, // Current progress percentage
  lastProgressUpdate: { type: Date }, // When progress was last updated
  progressHistory: [{ // Track all progress updates
    percentage: { type: Number, required: true, min: 0, max: 100 },
    notes: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
    isEndOfDay: { type: Boolean, default: false } // Flag for end-of-day updates
  }]
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema); 