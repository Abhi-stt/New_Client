const mongoose = require('mongoose');

const ManagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who created this manager
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin domain this manager belongs to
}, { timestamps: true });

module.exports = mongoose.model('Manager', ManagerSchema); 