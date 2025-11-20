const express = require('express');
const User = require('../schemas/User');
const UserActivity = require('../schemas/UserActivity');
const DemoRequest = require('../schemas/DemoRequest');
const { validateUser, sanitizeInput, requireSuperAdmin } = require('../middleware/validation');
const { checkEmailUnique } = require('../utils/validations');
const router = express.Router();

// All routes require super admin access
router.use(requireSuperAdmin);

// Get all users (super admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password -twoFactorCode')
      .sort({ createdAt: -1 }); // Sort by creation date, newest first
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (super admin only)
router.post('/users', sanitizeInput, validateUser, async (req, res) => {
  try {
    const { name, email, password, role, phone, managerId, clientIds, firmIds } = req.body;
    const { userId: createdBy } = req.query;

    // Check if email is unique across users and clients
    const emailCheck = await checkEmailUnique(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    // Role hierarchy validation
    const roleHierarchy = {
      super_admin: ['admin', 'manager', 'team_member', 'client'],
      admin: ['manager', 'team_member', 'client'],
      manager: ['team_member', 'client'],
      team_member: [],
      client: []
    };

    const currentUser = await User.findById(createdBy);
    if (currentUser && !roleHierarchy[currentUser.role]?.includes(role)) {
      return res.status(403).json({ error: `You cannot create users with ${role} role` });
    }

    const newUser = new User({
      name,
      email,
      password, // In production, hash this password
      role,
      phone,
      managerId,
      clientIds,
      firmIds,
      createdBy
    });

    await newUser.save();

    // Log the activity
    await new UserActivity({
      userId: createdBy,
      action: 'create_user',
      description: `Created new user: ${name} (${email}) with role: ${role}`,
      metadata: { createdUserId: newUser._id, role, email }
    }).save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (super admin only)
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userId: updatedBy } = req.query;
    const updateData = req.body;

    // Don't allow updating to super_admin role unless it's the same user
    if (updateData.role === 'super_admin' && userId !== updatedBy) {
      return res.status(403).json({ error: 'Cannot change other users to super admin' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData },
      { new: true }
    ).select('-password -twoFactorCode');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the activity
    await new UserActivity({
      userId: updatedBy,
      action: 'update_user',
      description: `Updated user: ${user.name} (${user.email})`,
      metadata: { updatedUserId: userId, changes: updateData }
    }).save();

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (super admin only)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userId: deletedBy } = req.query;

    // Don't allow super admin to delete themselves
    if (userId === deletedBy) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has any dependencies (clients, tasks, etc.)
    const hasClients = await User.findOne({ managerId: userId });
    if (hasClients) {
      return res.status(400).json({ 
        error: 'Cannot delete user. This user is managing other users. Please reassign them first.' 
      });
    }

    // Actually delete the user from database
    await User.findByIdAndDelete(userId);

    // Log the activity
    await new UserActivity({
      userId: deletedBy,
      action: 'delete_user',
      description: `Permanently deleted user: ${user.name} (${user.email})`,
      metadata: { deletedUserId: userId, userRole: user.role }
    }).save();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user activities (super admin only)
router.get('/activities', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
    
    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const activities = await UserActivity.find(query)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await UserActivity.countDocuments(query);

    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats for super admin
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const recentActivities = await UserActivity.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivities = await UserActivity.countDocuments({
      timestamp: { $gte: today }
    });

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weeklyActivities = await UserActivity.countDocuments({
      timestamp: { $gte: thisWeek }
    });

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        todayActivities,
        weeklyActivities
      },
      usersByRole,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details with activities
router.get('/users/:userId/details', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password -twoFactorCode');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activities = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(20);

    res.json({ user, activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all demo requests (super admin only)
router.get('/demo-requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const requests = await DemoRequest.find(query)
      .populate('contactedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await DemoRequest.countDocuments(query);

    res.json({
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update demo request status (super admin only)
router.put('/demo-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId: updatedBy } = req.query;
    const { status, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    if (status === 'contacted' || status === 'completed') {
      updateData.contactedBy = updatedBy;
      updateData.contactedAt = new Date();
    }

    const request = await DemoRequest.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true }
    ).populate('contactedBy', 'name email');

    if (!request) {
      return res.status(404).json({ error: 'Demo request not found' });
    }

    res.json({ message: 'Demo request updated successfully', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

