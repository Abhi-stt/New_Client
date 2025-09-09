const express = require('express');
const User = require('../schemas/User');
const Client = require('../schemas/Client');
const Task = require('../schemas/Task');
const Document = require('../schemas/Document');
const Query = require('../schemas/Query');
const Firm = require('../schemas/Firm');
const mongoose = require('mongoose');
const { getUserAdminId, buildAccessFilter, getAdminDomainStats } = require('../utils/accessControl');
const router = express.Router();

// Helper function to safely convert string to ObjectId
const safeObjectId = (id) => {
  try {
    if (!id) return null;
    // Check if it's already an ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return null;
  } catch (error) {
    console.error('ObjectId conversion error:', error);
    return null;
  }
};

// Admin dashboard
router.get('/admin', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: 'admin', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Build access filter for admin domain isolation
    const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    // Fetch real data from database within admin domain
    const totalUsers = await User.countDocuments(accessFilter);
    const totalClients = await Client.countDocuments(accessFilter);
    const totalDocuments = await Document.countDocuments(accessFilter);
    const pendingTasks = await Task.countDocuments({ 
      ...accessFilter,
      status: { $in: ['pending', 'in_progress'] } 
    });
    const overdueTasks = await Task.countDocuments({ 
      ...accessFilter,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: new Date() }
    });
    const completedTasks = await Task.countDocuments({ 
      ...accessFilter,
      status: 'completed' 
    });
    const totalTasks = completedTasks + pendingTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const dashboardData = {
      stats: {
        totalUsers,
        totalClients,
        totalDocuments,
        pendingTasks,
        overdueItems: overdueTasks,
        completionRate,
      },
      recentActivity: [
        { type: 'task_created', message: 'New GST filing task created', time: '2 hours ago' },
        { type: 'document_uploaded', message: 'Bank statement uploaded for ABC Corp', time: '4 hours ago' },
        { type: 'query_resolved', message: 'Tax query resolved for XYZ Ltd', time: '6 hours ago' }
      ],
      upcomingDeadlines: [
        { title: 'GST Return - ABC Corp', dueDate: '2024-01-20', priority: 'high' },
        { title: 'TDS Payment - XYZ Ltd', dueDate: '2024-01-25', priority: 'medium' },
        { title: 'Audit Report - DEF Industries', dueDate: '2024-01-30', priority: 'low' }
      ]
    };
    res.json(dashboardData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Client dashboard
router.get('/client', async (req, res) => {
  try {
    const { userId } = req.query;
    const clientId = safeObjectId(userId);
    
    // Fetch real data for the specific client
    const totalFirms = clientId ? await Firm.countDocuments({ clientId }) : 0;
    const totalDocuments = clientId ? await Document.countDocuments({ clientId }) : 0;
    const pendingTasks = clientId ? await Task.countDocuments({ 
      clientId, 
      status: { $in: ['pending', 'in_progress'] } 
    }) : 0;
    const completedTasks = clientId ? await Task.countDocuments({ 
      clientId, 
      status: 'completed' 
    }) : 0;
    
    // Get recent documents
    const recentDocuments = clientId ? await Document.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean() : [];

    // Get upcoming deadlines (tasks)
    const upcomingDeadlines = clientId ? await Task.find({ 
      clientId,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $gte: new Date() }
    })
    .sort({ dueDate: 1 })
    .limit(5)
    .lean() : [];

    const dashboardData = {
      stats: {
        totalFirms,
        totalDocuments,
        pendingRequests: pendingTasks,
        completedTasks,
        teamMembers: 6, // This would need to be calculated based on assigned team
        complianceRate: 95,
      },
      documents: recentDocuments.map(doc => ({
        name: doc.name,
        uploadedDate: doc.createdAt,
        type: doc.type
      })),
      deadlines: upcomingDeadlines.map(task => ({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        firmName: 'Client Firm', // This would need to be fetched from firm data
        urgency: task.priority
      })),
      requests: [
        { documentName: 'Bank Statement', description: 'Latest bank statement for reconciliation', dueDate: '2024-01-18', requestedBy: 'CA John Smith', priority: 'high' },
        { documentName: 'Purchase Invoices', description: 'All purchase invoices for December 2024', dueDate: '2024-01-22', requestedBy: 'CA Jane Doe', priority: 'medium' }
      ]
    };
    res.json(dashboardData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Manager dashboard
router.get('/manager', async (req, res) => {
  try {
    const { userId } = req.query;
    const managerId = safeObjectId(userId);
    
    if (!managerId) {
      return res.status(400).json({ error: 'Valid managerId is required' });
    }
    
    // Get admin domain for the manager
    const userAdminId = await getUserAdminId(managerId);

    console.log(`Fetching manager dashboard data for manager ID: ${managerId}, admin: ${userAdminId}`);

    // 1. Get team members under this manager within the same admin domain
    const teamMembers = await User.countDocuments({ 
      managerId: managerId,
      adminId: userAdminId,
      status: 'active',
      role: { $in: ['team_member', 'manager'] }
    });

    // 2. Get assigned clients within the admin domain
    // First, get all users under this manager to find their client assignments
    const teamMemberIds = await User.find({ 
      managerId: managerId,
      adminId: userAdminId,
      status: 'active',
      role: { $in: ['team_member', 'manager'] }
    }).distinct('_id');

    // Add the manager's own ID to include their direct client assignments
    teamMemberIds.push(managerId);

    // Get unique clients assigned to the manager and their team within admin domain
    const assignedClientIds = await Task.find({
      adminId: userAdminId,
      $or: [
        { assigneeId: { $in: teamMemberIds } },
        { createdBy: managerId }
      ],
      clientId: { $exists: true, $ne: null }
    }).distinct('clientId');

    const assignedClients = assignedClientIds.length;

    // 3. Get pending tasks for the manager's team within admin domain
    const pendingTasks = await Task.countDocuments({
      adminId: userAdminId,
      $or: [
        { assigneeId: { $in: teamMemberIds } },
        { createdBy: managerId }
      ],
      status: { $in: ['pending', 'in_progress'] }
    });

    // 4. Get completed tasks for the manager's team within admin domain
    const completedTasks = await Task.countDocuments({
      adminId: userAdminId,
      $or: [
        { assigneeId: { $in: teamMemberIds } },
        { createdBy: managerId }
      ],
      status: 'completed'
    });

    // 5. Get overdue tasks within admin domain
    const overdueTasks = await Task.countDocuments({
      adminId: userAdminId,
      $or: [
        { assigneeId: { $in: teamMemberIds } },
        { createdBy: managerId }
      ],
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: new Date() }
    });

    // 6. Calculate team performance percentage
    const totalTeamTasks = pendingTasks + completedTasks;
    const teamPerformanceRate = totalTeamTasks > 0 ? Math.round((completedTasks / totalTeamTasks) * 100) : 0;

    // 7. Get recent team activities within admin domain
    const recentTeamTasks = await Task.find({
      adminId: userAdminId,
      $or: [
        { assigneeId: { $in: teamMemberIds } },
        { createdBy: managerId }
      ]
    })
    .populate('assigneeId', 'name')
    .populate('clientId', 'name')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

    const teamActivities = recentTeamTasks.map(task => ({
      description: `${task.title} - ${task.status ? task.status.replace('_', ' ') : 'unknown'}`,
      timestamp: new Date(task.updatedAt).toLocaleDateString(),
      member: task.assigneeId?.name || 'Unassigned',
      client: task.clientId?.name || 'No Client'
    }));

    console.log(`Manager dashboard stats: TeamMembers=${teamMembers}, Clients=${assignedClients}, Pending=${pendingTasks}, Completed=${completedTasks}, Overdue=${overdueTasks}`);

    const dashboardData = {
      stats: {
        teamMembers,
        assignedClients,
        pendingTasks,
        completedTasks,
        overdueItems: overdueTasks,
        teamPerformance: teamPerformanceRate,
      },
      teamPerformance: teamActivities,
      recentTasks: recentTeamTasks.slice(0, 5).map(task => ({
        title: task.title,
        client: task.clientId?.name || 'No Client',
        assignee: task.assigneeId?.name || 'Unassigned',
        dueDate: task.dueDate,
        status: task.status
      }))
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Manager dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Team member dashboard
router.get('/team-member', async (req, res) => {
  try {
    const { userId } = req.query;
    const teamMemberId = safeObjectId(userId);
    
    // Fetch real data for the team member
    const assignedTasks = teamMemberId ? await Task.countDocuments({ assigneeId: teamMemberId }) : 0;
    const completedTasks = teamMemberId ? await Task.countDocuments({ 
      assigneeId: teamMemberId, 
      status: 'completed' 
    }) : 0;
    const pendingTasks = teamMemberId ? await Task.countDocuments({ 
      assigneeId: teamMemberId, 
      status: { $in: ['pending', 'in_progress'] } 
    }) : 0;
    const overdueTasks = teamMemberId ? await Task.countDocuments({ 
      assigneeId: teamMemberId,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: new Date() }
    }) : 0;
    const assignedClients = teamMemberId ? await Client.countDocuments({ 
      assignedTeamMembers: teamMemberId 
    }) : 0;

    // Get my tasks
    const myTasks = teamMemberId ? await Task.find({ assigneeId: teamMemberId })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean() : [];

    const dashboardData = {
      stats: {
        assignedTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        assignedClients,
        efficiency: 85,
      },
      myTasks: myTasks.map(task => ({
        title: task.title,
        client: 'Client Name', // This would need to be fetched from client data
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status
      })),
      recentActivity: [
        { type: 'task_completed', message: 'Completed GST return for ABC Corp', time: '1 hour ago' },
        { type: 'document_uploaded', message: 'Uploaded bank statement for XYZ Ltd', time: '3 hours ago' }
      ]
    };
    res.json(dashboardData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 