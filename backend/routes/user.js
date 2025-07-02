const express = require('express');
const User = require('../schemas/User');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login with proper validation
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password (simple comparison for demo - in production use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check 2FA if enabled
    if (user.twoFactorEnabled && !twoFactorCode) {
      return res.status(401).json({ error: '2FA code required' });
    }
    
    // Return user data (without password)
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      managerId: user.managerId,
      clientIds: user.clientIds,
      firmIds: user.firmIds,
      phone: user.phone,
      twoFactorEnabled: user.twoFactorEnabled,
    };
    
    res.json({ user: userResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create demo users
router.post('/create-demo-users', async (req, res) => {
  try {
    const demoUsers = [
      {
        email: 'admin@demo.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        phone: '+91-9876543210',
        twoFactorEnabled: false,
      },
      {
        email: 'manager@demo.com',
        password: 'manager123',
        name: 'Manager User',
        role: 'manager',
        phone: '+91-9876543211',
        twoFactorEnabled: false,
      },
      {
        email: 'team@demo.com',
        password: 'team123',
        name: 'Team Member',
        role: 'team_member',
        phone: '+91-9876543212',
        twoFactorEnabled: false,
      },
      {
        email: 'client@demo.com',
        password: 'client123',
        name: 'Client User',
        role: 'client',
        phone: '+91-9876543213',
        twoFactorEnabled: false,
      },
    ];

    // Check if demo users already exist
    for (const demoUser of demoUsers) {
      const existingUser = await User.findOne({ email: demoUser.email });
      if (!existingUser) {
        const user = new User(demoUser);
        await user.save();
      }
    }

    res.json({ message: 'Demo users created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if 2FA is required
router.post('/check-2fa', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ requires2FA: user.twoFactorEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({
      ...user.toObject(),
      id: user._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get team members
router.get('/team-members', async (req, res) => {
  try {
    const teamMembers = await User.find({ role: { $in: ['team_member', 'manager'] } });
    res.json(teamMembers.map(user => ({
      ...user.toObject(),
      id: user._id,
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get managers
router.get('/managers', async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' });
    res.json(managers.map(user => ({
      ...user.toObject(),
      id: user._id,
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update user
router.put('/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Delete user
router.delete('/:id', async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

// Enable/disable 2FA
router.post('/:id/2fa', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.twoFactorEnabled = req.body.action === 'enable';
    if (req.body.code) {
      user.twoFactorCode = req.body.code;
    }
    
    await user.save();
    res.json({ message: `2FA ${req.body.action}d successfully` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Assign clients to team member
router.patch('/:id/assign-clients', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.assignedClientIds = req.body.clientIds;
    await user.save();
    
    res.json({
      ...user.toObject(),
      id: user._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create manager
router.post('/create-manager', async (req, res) => {
  try {
    const manager = new User({
      ...req.body,
      role: 'manager',
    });
    await manager.save();
    res.status(201).json({
      ...manager.toObject(),
      id: manager._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 