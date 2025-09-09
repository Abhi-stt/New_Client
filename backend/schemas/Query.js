const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['tax', 'gst', 'compliance', 'documentation', 'general'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'resolved', 'closed'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin domain this query belongs to
}, { timestamps: true });

module.exports = mongoose.model('Query', QuerySchema); 