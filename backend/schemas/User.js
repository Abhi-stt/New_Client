const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'team_member', 'client'], required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  firmIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }],
  phone: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorFailedAttempts: { type: Number, default: 0 },
  twoFactorLockedUntil: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);  