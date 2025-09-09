const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['compliance', 'accounting', 'tax', 'audit', 'consulting', 'other'], required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }, // Optional firm association
  dueDate: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  autoCreateTasks: { type: Boolean, default: true }, // Whether to auto-create tasks for this service
  taskTemplates: [{ // Predefined task templates for this service
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    estimatedHours: { type: Number },
    dependencies: [{ type: String }] // Task titles that should be completed first
  }],
  metadata: { type: mongoose.Schema.Types.Mixed } // Additional service-specific data
}, { timestamps: true });

ServiceSchema.index({ clientId: 1, status: 1 });
ServiceSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
