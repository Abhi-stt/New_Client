const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['tax', 'gst', 'compliance', 'documentation', 'general'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'resolved', 'closed'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String },
  createdByRole: { 
    type: String, 
    enum: ['super_admin', 'admin', 'manager', 'team_member', 'client'], 
    default: 'client' 
  },
  responses: [{
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    userRole: { 
      type: String, 
      enum: ['super_admin', 'admin', 'manager', 'team_member', 'client'],
      default: 'admin'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin domain this query belongs to
}, { timestamps: true });

module.exports = mongoose.model('Query', QuerySchema); 