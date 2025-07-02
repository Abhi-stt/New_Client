const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: String, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['task', 'meeting', 'deadline', 'reminder'], default: 'task' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  isRecurring: { type: Boolean, default: false },
  recurrenceType: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  recurrenceInterval: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema); 