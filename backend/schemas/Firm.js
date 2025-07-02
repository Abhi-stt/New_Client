const mongoose = require('mongoose');

const FirmSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['pvt_ltd', 'public_ltd', 'partnership', 'llp', 'proprietorship'], required: true },
  registrationNumber: { type: String },
  address: { type: String },
  panNumber: { type: String },
  gstNumber: { type: String },
  cinNumber: { type: String },
  incorporationDate: { type: String },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Firm', FirmSchema); 