const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  type: { type: String, enum: ['individual', 'company', 'partnership', 'llp'], required: true },
  registrationNumber: { type: String },
  panNumber: { type: String },
  gstNumber: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema); 