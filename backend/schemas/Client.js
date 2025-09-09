const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  type: { type: String, enum: ['individual', 'company', 'partnership', 'llp'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'active' },
  registrationNumber: { type: String },
  panNumber: { type: String },
  gstNumber: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Manager assigned to this client
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Who created this client
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Which admin domain this client belongs to
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema); 