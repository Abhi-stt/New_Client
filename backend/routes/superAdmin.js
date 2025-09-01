const express = require('express');
const User = require('../schemas/User');
const UserActivity = require('../schemas/UserActivity');
const router = express.Router();

// Middleware to check if user is super admin
const requireSuperAdmin = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users (super admin only)
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password -twoFactorCode');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (super admin only)
router.post('/users', requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone, managerId, clientIds, firmIds } = req.body;
    const { userId: createdBy } = req.query;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
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
router.put('/users/:userId', requireSuperAdmin, async (req, res) => {
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
router.delete('/users/:userId', requireSuperAdmin, async (req, res) => {
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

    // Soft delete - just mark as inactive
    await User.findByIdAndUpdate(userId, { isActive: false });

    // Log the activity
    await new UserActivity({
      userId: deletedBy,
      action: 'delete_user',
      description: `Deleted user: ${user.name} (${user.email})`,
      metadata: { deletedUserId: userId, userRole: user.role }
    }).save();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user activities (super admin only)
router.get('/activities', requireSuperAdmin, async (req, res) => {
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
router.get('/dashboard-stats', requireSuperAdmin, async (req, res) => {
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
router.get('/users/:userId/details', requireSuperAdmin, async (req, res) => {
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

module.exports = router;

