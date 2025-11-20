const mongoose = require('mongoose');

const DemoRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'contacted', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  notes: { type: String },
  contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contactedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('DemoRequest', DemoRequestSchema);


