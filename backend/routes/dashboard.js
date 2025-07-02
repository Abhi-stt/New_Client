const express = require('express');
const User = require('../schemas/User');
const Client = require('../schemas/Client');
const Task = require('../schemas/Task');
const Document = require('../schemas/Document');
const Query = require('../schemas/Query');
const Firm = require('../schemas/Firm');
const mongoose = require('mongoose');
const router = express.Router();

// Helper function to safely convert string to ObjectId
const safeObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId(id);
  } catch (error) {
    return null;
  }
};

// Admin dashboard
router.get('/admin', async (req, res) => {
  try {
    // Fetch real data from database
    const totalUsers = await User.countDocuments();
    const totalClients = await Client.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: { $in: ['pending', 'in_progress'] } });
    const overdueTasks = await Task.countDocuments({ 
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: new Date() }
    });
    const completedTasks = await Task.countDocuments({ status: 'completed' });
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
    
    // Fetch real data for the manager
    const teamMembers = managerId ? await User.countDocuments({ managerId }) : 0;
    const assignedClients = managerId ? await Client.countDocuments({ managerId }) : 0;
    const activeTasks = managerId ? await Task.countDocuments({ 
      assigneeId: managerId, 
      status: { $in: ['pending', 'in_progress'] } 
    }) : 0;
    const completedTasks = managerId ? await Task.countDocuments({ 
      assigneeId: managerId, 
      status: 'completed' 
    }) : 0;
    const pendingQueries = await Query.countDocuments({ 
      status: { $in: ['pending', 'in_progress'] } 
    });

    // Get team performance data
    const teamPerformance = managerId ? await User.find({ managerId })
      .lean()
      .map(user => ({
        name: user.name,
        tasksCompleted: 0, // This would need to be calculated
        clientsAssigned: 0, // This would need to be calculated
        rating: 4.5
      })) : [];

    const dashboardData = {
      stats: {
        assignedClients,
        teamMembers,
        activeTasks,
        completedTasks,
        pendingQueries,
        complianceRate: 88,
      },
      teamPerformance,
      recentTasks: [
        { title: 'GST Return Filing', client: 'ABC Corp', assignee: 'John Smith', dueDate: '2024-01-20', status: 'in_progress' },
        { title: 'Bank Reconciliation', client: 'XYZ Ltd', assignee: 'Jane Doe', dueDate: '2024-01-22', status: 'pending' }
      ]
    };
    res.json(dashboardData);
  } catch (err) {
    res.status(400).json({ error: err.message });
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