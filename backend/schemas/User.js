const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'manager', 'team_member', 'client'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'active' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  firmIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }],
  phone: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorFailedAttempts: { type: Number, default: 0 },
  twoFactorLockedUntil: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin domain this user belongs to
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);  