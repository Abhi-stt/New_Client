const express = require('express');
const User = require('../schemas/User');
const UserActivity = require('../schemas/UserActivity');
const { validateUser, sanitizeInput, requireAdmin } = require('../middleware/validation');
const { checkEmailUnique } = require('../utils/validations');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
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
    
    // REMOVE 2FA check here so login does not require 2FA
    // if (user.twoFactorEnabled && !twoFactorCode) {
    //   return res.status(401).json({ error: '2FA code required' });
    // }
    
    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();
    
    // Log login activity
    await new UserActivity({
      userId: user._id,
      action: 'login',
      description: `User logged in successfully`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).save();
    
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
        email: 'superadmin@demo.com',
        password: 'superadmin123',
        name: 'Super Admin User',
        role: 'super_admin',
        phone: '+91-9876543209',
        twoFactorEnabled: false,
      },
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
  try {
    // Get user from middleware (assuming auth middleware sets req.user)
    const currentUser = req.user || { role: 'guest', id: null };
    
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    const users = await User.find(accessFilter);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (team member)
router.post('/', sanitizeInput, validateUser, async (req, res) => {
  try {
    const { name, email, password, role, phone, managerId, status } = req.body;
    
    // Get current user for ownership (from middleware or query params)
    const { role: queryRole, userId: queryUserId } = req.query;
    const currentUser = req.user || { role: queryRole || 'guest', id: queryUserId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);

    // Check if email is unique
    const emailCheck = await checkEmailUnique(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    // Set ownership fields
    const ownershipFields = setOwnershipFields(currentUser.role, currentUser.id, userAdminId);

    const user = new User({
      name,
      email,
      password,
      role,
      phone: phone || '',
      managerId: managerId || null,
      status: status || 'active',
      ...ownershipFields
    });
    
    await user.save();
    
    // Log activity if UserActivity schema exists
    try {
      const UserActivity = require('../schemas/UserActivity');
      await new UserActivity({
        userId: currentUser.id,
        adminId: userAdminId,
        action: 'create_user',
        description: `Created new user: ${name} (${email}) with role: ${role}`,
        metadata: { createdUserId: user._id, role, email }
      }).save();
    } catch (activityError) {
      console.error('Failed to log activity (non-blocking):', activityError);
    }
    
    res.status(201).json({
      ...user.toObject(),
      id: user._id,
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
});

// Get team members
router.get('/team-members', async (req, res) => {
  try {
    const { managerId, role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    let query = {};
    let populateOptions = [
      { path: 'managerId', select: 'name email' },
      { path: 'clientIds', select: 'name' }
    ];
    
    // Build base access filter for admin domain isolation
    const baseAccessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    if (managerId) {
      // Get team members for a specific manager
      query = { 
        ...baseAccessFilter,
        managerId: managerId,
        role: 'team_member' 
      };
    } else if (role === 'manager' && userId) {
      // For managers, get their own team members
      query = { 
        ...baseAccessFilter,
        managerId: userId,
        status: 'active',
        role: 'team_member'
      };
    } else if (role === 'admin') {
      // For admins, get all team members and managers in their domain
      query = { 
        ...baseAccessFilter,
        role: { $in: ['team_member', 'manager'] }
      };
    } else {
      // Default: get all team members in the same admin domain
      query = { 
        ...baseAccessFilter,
        role: 'team_member' 
      };
    }
    
    console.log(`Team members query for role=${role}, userId=${userId}:`, query);
    
    const teamMembers = await User.find(query)
      .populate(populateOptions)
      .sort({ name: 1 });
    
    console.log(`Found ${teamMembers.length} team members for manager ${userId}`);
    
    res.json(teamMembers.map(user => ({
      ...user.toObject(),
      id: user._id,
      clientNames: user.clientIds?.map(client => client.name) || [],
      managerName: user.managerId?.name || null,
    })));
  } catch (err) {
    console.error('Team members API error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get managers
router.get('/managers', async (req, res) => {
  try {
    const { role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Build access filter for admin domain isolation
    const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    const managers = await User.find({ 
      ...accessFilter,
      role: 'manager' 
    });
    
    console.log(`Found ${managers.length} managers in admin domain ${userAdminId}`);
    
    res.json(managers.map(user => ({
      ...user.toObject(),
      id: user._id,
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all team members (managers and team members) for admin
router.get('/all-team-members', async (req, res) => {
  try {
    const { clientId, role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'admin', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Build access filter for admin domain isolation
    const baseAccessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    let query = { 
      ...baseAccessFilter,
      role: { $in: ['manager', 'team_member'] } 
    };
    
    // If clientId is provided, filter team members who work on that client
    if (clientId) {
      query.clientIds = clientId;
    }
    
    console.log(`All team members query for admin=${currentUser.id}, adminId=${userAdminId}:`, query);
    
    const teamMembers = await User.find(query)
      .populate('clientIds', 'name')
      .populate('managerId', 'name');
      
    console.log(`Found ${teamMembers.length} team members in admin domain ${userAdminId}`);
      
    res.json(teamMembers.map(user => ({
      ...user.toObject(),
      id: user._id,
      clientNames: user.clientIds?.map(client => client.name) || [],
      managerName: user.managerId?.name || null,
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get own profile (with 2FA code)
router.get('/:id', async (req, res) => {
  try {
    // TODO: In production, check authentication: req.user.id === req.params.id
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorCode: user.twoFactorCode, // Only for self!
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    const actorId = req.headers['x-user-id'] || req.body.actorId;
    const actorRole = req.headers['x-user-role'] || req.body.actorRole;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Admin can do anything
    if (actorRole === 'admin') {
      // allow enable, disable, reset
    } else if (actorRole === 'manager') {
      // Only allow reset for team members
      if (req.body.action !== 'reset' || targetUser.role !== 'team_member') {
        return res.status(403).json({ error: 'Managers can only reset 2FA for team members.' });
      }
    } else {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    if (req.body.action === 'enable') {
      targetUser.twoFactorEnabled = true;
      if (req.body.code) {
        targetUser.twoFactorCode = req.body.code;
      }
    } else if (req.body.action === 'disable') {
      targetUser.twoFactorEnabled = false;
      targetUser.twoFactorCode = undefined;
      targetUser.twoFactorFailedAttempts = 0;
      targetUser.twoFactorLockedUntil = null;
    } else if (req.body.action === 'reset') {
      if (req.body.code) {
        targetUser.twoFactorCode = req.body.code;
        targetUser.twoFactorFailedAttempts = 0;
        targetUser.twoFactorLockedUntil = null;
      } else {
        return res.status(400).json({ error: 'Reset requires a new code.' });
      }
    }
    await targetUser.save();
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
router.post('/create-manager', sanitizeInput, validateUser, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email is unique
    const emailCheck = await checkEmailUnique(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    const manager = new User({
      name,
      email,
      password,
      phone,
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