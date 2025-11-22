const express = require('express');
const Task = require('../schemas/Task');
const Service = require('../schemas/Service');
const User = require('../schemas/User');
const UserActivity = require('../schemas/UserActivity');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
const router = express.Router();

// Create a new task
router.post('/', async (req, res) => {
  try {
    console.log('Create task request body:', JSON.stringify(req.body, null, 2))
    const { createdBy, assigneeId, serviceId, estimatedHours, dueDate, tags, title, ...taskData } = req.body;
    
    // Validate required fields
    if (!createdBy) {
      console.error('Validation failed: createdBy is required')
      return res.status(400).json({ error: 'createdBy is required' });
    }
    
    if (!title || title.trim() === '') {
      console.error('Validation failed: title is required')
      return res.status(400).json({ error: 'title is required' });
    }
    
    // Validate ObjectId formats
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      console.error('Validation failed: createdBy is not a valid ObjectId:', createdBy)
      return res.status(400).json({ error: 'Invalid createdBy format' });
    }
    
    // If no assigneeId provided, default to the creator (self-assigned task)
    const finalAssigneeId = assigneeId || createdBy;
    
    if (!mongoose.Types.ObjectId.isValid(finalAssigneeId)) {
      console.error('Validation failed: assigneeId is not a valid ObjectId:', finalAssigneeId)
      return res.status(400).json({ error: 'Invalid assigneeId format' });
    }
    
    console.log('Final assigneeId:', finalAssigneeId)
    
    // Get admin domain for the creator
    const userAdminId = await getUserAdminId(createdBy);
    console.log('User admin ID:', userAdminId)
    
    // Set ownership fields
    const ownershipFields = {
      adminId: userAdminId
    };

    // Validate and clean optional fields
    const cleanData = {
      ...taskData,
      title: title.trim(),
      createdBy,
      assigneeId: finalAssigneeId,
      ...ownershipFields
    };
    
    // Only include serviceId if it's provided and valid ObjectId
    if (serviceId && serviceId !== '' && serviceId !== 'none' && mongoose.Types.ObjectId.isValid(serviceId)) {
      cleanData.serviceId = serviceId;
    }
    
    // Only include clientId if it's provided and valid ObjectId
    if (cleanData.clientId && cleanData.clientId !== '' && cleanData.clientId !== 'none') {
      if (mongoose.Types.ObjectId.isValid(cleanData.clientId)) {
        // Keep it
      } else {
        console.warn('Invalid clientId format, removing:', cleanData.clientId);
        delete cleanData.clientId;
      }
    } else {
      delete cleanData.clientId;
    }
    
    // Clean up any undefined values
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined || cleanData[key] === null || cleanData[key] === '') {
        if (key !== 'description' && key !== 'dueDate') {
          delete cleanData[key];
        }
      }
    });
    
    console.log('Clean task data:', JSON.stringify({ ...cleanData, clientId: cleanData.clientId || 'none' }, null, 2))

    // Handle estimatedHours - only set if it's a valid positive number
    if (estimatedHours && !isNaN(estimatedHours) && estimatedHours > 0) {
      cleanData.estimatedHours = parseInt(estimatedHours);
    }

    // Handle dueDate - only set if it's a valid date
    if (dueDate && dueDate !== '') {
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        cleanData.dueDate = parsedDate;
      }
    }

    // Handle tags - only set if they exist and are valid
    if (tags && Array.isArray(tags) && tags.length > 0) {
      cleanData.tags = tags.filter(tag => tag && tag.trim() !== '');
    }

    // Create the task
    console.log('Creating task with data:', JSON.stringify({ ...cleanData, clientId: cleanData.clientId || 'none' }, null, 2))
    const task = new Task(cleanData);
    
    await task.save();
    console.log('Task created successfully:', task._id)
    
    // Log activity
    try {
      await new UserActivity({
        userId: createdBy,
        adminId: userAdminId,
        action: 'create_task',
        description: `Created task: ${task.title}`,
        metadata: { 
          taskId: task._id, 
          assigneeId: finalAssigneeId,
          serviceId: serviceId 
        }
      }).save();
    } catch (activityError) {
      console.error('Failed to log activity (non-blocking):', activityError);
    }

    // Populate the response
    const populatedTask = await Task.findById(task._id)
      .populate('clientId', 'name')
      .populate('assigneeId', 'name email')
      .populate('createdBy', 'name email')
      .populate('serviceId', 'name category');

    res.status(201).json({
      ...populatedTask.toObject(),
      id: populatedTask._id
    });
  } catch (err) {
    console.error('Task creation error:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.errors) {
      console.error('Error details:', JSON.stringify(err.errors, null, 2));
    }
    
    // Return detailed error for validation failures
    if (err.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(err.errors).forEach(key => {
        validationErrors[key] = err.errors[key].message;
        console.error(`Validation error for ${key}:`, err.errors[key].message);
      });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors,
        message: err.message
      });
    }
    
    res.status(400).json({ 
      error: err.message || 'Failed to create task',
      details: err.errors || {},
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    let query = {};

    // Role-based filtering with admin domain isolation
    if (role === 'client') {
      // Clients can see their own tasks within their admin domain
      query = {
        adminId: userAdminId,
        $or: [
          { clientId: userId },
          { createdBy: userId }
        ]
      };
    } else if (role === 'team_member') {
      // Team members can see tasks assigned to them within their admin domain
      query = { 
        adminId: userAdminId,
        assigneeId: userId 
      };
    } else if (role === 'manager') {
      // Managers can see tasks for their team and clients within their admin domain
      const User = require('../schemas/User');
      const Client = require('../schemas/Client');
      const teamMembers = await User.find({ 
        managerId: userId,
        adminId: userAdminId 
      }, '_id');
      const teamMemberIds = teamMembers.map(u => u._id);
      const clients = await Client.find({ 
        managerId: userId,
        adminId: userAdminId 
      }, '_id');
      const clientIds = clients.map(c => c._id);
      query = {
        adminId: userAdminId,
        $or: [
          { assigneeId: { $in: [userId, ...teamMemberIds] } },
          { clientId: { $in: clientIds } }
        ]
      };
    } else if (role === 'super_admin') {
      // Super admin can see all tasks across all domains
      query = {};
    } else {
      // Admin can see all tasks in their domain only
      const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
      query = accessFilter;
    }

    const tasks = await Task.find(query)
      .populate('clientId', 'name')
      .populate('assigneeId', 'name email')
      .populate('createdBy', 'name email')
      .populate('reassignedFrom', 'name email')
      .populate('reassignedBy', 'name email')
      .sort({ createdAt: -1 }); // Sort by most recent first
    res.json(tasks.map(task => ({
      ...task.toObject(),
      id: task._id
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({
    ...task.toObject(),
    id: task._id,
  });
});

// Update task
router.put('/:id', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Delete task
router.delete('/:id', async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
});

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, completionNotes, reviewNotes, userId } = req.body;
    const taskId = req.params.id;
    
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const oldStatus = task.status;
    const updateData = { status };

    // Handle completion
    if (status === 'completed' && oldStatus !== 'completed') {
      updateData.completedAt = new Date();
      if (completionNotes) updateData.completionNotes = completionNotes;
      
      // Create review task for the original task creator
      if (task.createdBy && task.createdBy.toString() !== task.assigneeId.toString()) {
        const reviewTask = new Task({
          title: `Review: ${task.title}`,
          description: `Please review the completed task: ${task.title}\n\nCompletion Notes: ${completionNotes || 'No notes provided'}`,
          clientId: task.clientId,
          serviceId: task.serviceId,
          assigneeId: task.createdBy, // Assign to original task creator
          createdBy: task.assigneeId, // Created by the person who completed it
          priority: task.priority,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'pending',
          originalTaskId: task._id,
          completionNotes: completionNotes
        });
        
        await reviewTask.save();
        
        // Link the review task to the original task
        task.reviewTaskId = reviewTask._id;
        updateData.reviewTaskId = reviewTask._id;
        
        // Log review task creation
        await new UserActivity({
          userId: task.assigneeId,
          action: 'create_review_task',
          description: `Created review task for: ${task.title}`,
          metadata: { 
            originalTaskId: task._id,
            reviewTaskId: reviewTask._id,
            reviewerId: task.createdBy
          }
        }).save();
      }
    }

    // Handle review completion
    if (status === 'approved' && oldStatus === 'review') {
      updateData.reviewedAt = new Date();
      if (reviewNotes) updateData.reviewNotes = reviewNotes;
      
      // Update the original task status to approved
      if (task.originalTaskId) {
        await Task.findByIdAndUpdate(task.originalTaskId, { 
          status: 'approved',
          reviewedAt: new Date(),
          reviewNotes: reviewNotes
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
      .populate('clientId', 'name')
      .populate('assigneeId', 'name email')
      .populate('createdBy', 'name email')
      .populate('serviceId', 'name category');

    // Log status change
    await new UserActivity({
      userId: userId || task.assigneeId,
      action: 'update_task_status',
      description: `Changed task status from ${oldStatus} to ${status}`,
      metadata: { 
        taskId: task._id,
        oldStatus,
        newStatus: status
      }
    }).save();

    res.json({
      ...updatedTask.toObject(),
      id: updatedTask._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reassign task
router.patch('/:id/reassign', async (req, res) => {
  try {
    const { newAssigneeId, reason, userId } = req.body;
    const taskId = req.params.id;
    
    if (!newAssigneeId || !userId) {
      return res.status(400).json({ error: 'newAssigneeId and userId are required' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Get the user making the reassignment
    const reassigningUser = await User.findById(userId);
    if (!reassigningUser) return res.status(404).json({ error: 'User not found' });
    
    // Get the new assignee
    const newAssignee = await User.findById(newAssigneeId);
    if (!newAssignee) return res.status(404).json({ error: 'New assignee not found' });
    
    // Check if the task is already assigned to the new assignee
    if (task.assigneeId.toString() === newAssigneeId) {
      return res.status(400).json({ error: 'Task is already assigned to this user' });
    }
    
    // Role-based validation for reassignment
    let canReassign = false;
    
    if (reassigningUser.role === 'admin' || reassigningUser.role === 'super_admin') {
      // Admins can reassign any task to anyone
      canReassign = true;
    } else if (reassigningUser.role === 'manager') {
      // Managers can reassign any task they can see in their task list
      // This includes:
      // 1. Tasks assigned to them
      // 2. Tasks they created  
      // 3. Tasks assigned to their team members
      // 4. Tasks for clients assigned to them
      
      // Check if new assignee is a team member under this manager or the manager themselves
      if (newAssigneeId === userId || 
          (newAssignee.managerId && newAssignee.managerId.toString() === userId)) {
        canReassign = true;
      }
    } else if (reassigningUser.role === 'team_member') {
      // Team members cannot reassign tasks
      canReassign = false;
    }
    
    if (!canReassign) {
      return res.status(403).json({ 
        error: 'You do not have permission to reassign this task',
        details: 'Only admins and managers (to their team members) can reassign tasks'
      });
    }
    
    // Store the previous assignee
    const previousAssigneeId = task.assigneeId;
    
    // Update the task
    const updateData = {
      assigneeId: newAssigneeId,
      reassignedFrom: previousAssigneeId,
      reassignedBy: userId,
      reassignedAt: new Date()
    };
    
    // Add to reassignment history
    const reassignmentRecord = {
      fromUserId: previousAssigneeId,
      toUserId: newAssigneeId,
      reassignedBy: userId,
      reassignedAt: new Date(),
      reason: reason || 'No reason provided'
    };
    
    if (!task.reassignmentHistory) {
      task.reassignmentHistory = [];
    }
    task.reassignmentHistory.push(reassignmentRecord);
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId, 
      { 
        ...updateData,
        reassignmentHistory: task.reassignmentHistory
      }, 
      { new: true }
    )
    .populate('clientId', 'name')
    .populate('assigneeId', 'name email')
    .populate('createdBy', 'name email')
    .populate('serviceId', 'name category')
    .populate('reassignedFrom', 'name email')
    .populate('reassignedBy', 'name email');
    
    // Log the reassignment activity
    await new UserActivity({
      userId: userId,
      action: 'reassign_task',
      description: `Reassigned task "${task.title}" from ${updatedTask.reassignedFrom?.name || 'Unknown'} to ${updatedTask.assigneeId?.name || 'Unknown'}`,
      metadata: { 
        taskId: task._id,
        previousAssigneeId: previousAssigneeId,
        newAssigneeId: newAssigneeId,
        reason: reason
      }
    }).save();
    
    res.json({
      ...updatedTask.toObject(),
      id: updatedTask._id,
      message: 'Task reassigned successfully'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create tasks from service
router.post('/from-service/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { createdBy } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    if (!service.autoCreateTasks || !service.taskTemplates || service.taskTemplates.length === 0) {
      return res.status(400).json({ error: 'Service does not have auto-create tasks enabled or no task templates' });
    }
    
    const createdTasks = [];
    
    // Create tasks from templates
    for (const template of service.taskTemplates) {
      const task = new Task({
        title: template.title,
        description: template.description,
        clientId: service.clientId,
        serviceId: service._id,
        assigneeId: service.assignedTo || createdBy,
        createdBy: createdBy,
        priority: template.priority,
        dueDate: service.dueDate,
        estimatedHours: template.estimatedHours,
        tags: [service.category]
      });
      
      await task.save();
      createdTasks.push(task);
      
      // Log activity
      await new UserActivity({
        userId: createdBy,
        action: 'create_task_from_service',
        description: `Created task from service: ${service.name} - ${template.title}`,
        metadata: { 
          taskId: task._id,
          serviceId: service._id,
          template: template.title
        }
      }).save();
    }
    
    // Update service status
    service.status = 'in_progress';
    await service.save();
    
    res.status(201).json({
      message: `Created ${createdTasks.length} tasks from service`,
      tasks: createdTasks,
      service: service
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get tasks for a specific service
router.get('/service/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const tasks = await Task.find({ serviceId })
      .populate('clientId', 'name')
      .populate('assigneeId', 'name email')
      .populate('createdBy', 'name email')
      .populate('serviceId', 'name category')
      .populate('reassignedFrom', 'name email')
      .populate('reassignedBy', 'name email');
    
    res.json(tasks.map(task => ({
      ...task.toObject(),
      id: task._id
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get users for task assignment (for cross-user assignment)
router.get('/users/assignable', async (req, res) => {
  try {
    const { role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Build base access filter for admin domain isolation
    const baseAccessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    let query = { 
      isActive: true,
      ...baseAccessFilter 
    };
    
    // Role-based filtering for assignable users
    if (role === 'client') {
      // Clients can only assign to team members and managers
      query.role = { $in: ['team_member', 'manager'] };
    } else if (role === 'team_member') {
      // Team members can assign to other team members and managers
      query.role = { $in: ['team_member', 'manager'] };
    } else if (role === 'manager') {
      // Managers should primarily assign to their own team members
      // First, get their team members within their admin domain
      const managerId = userId;
      const teamMembers = await User.find({ 
        managerId: managerId,
        isActive: true,
        role: 'team_member',
        ...baseAccessFilter
      }, 'name email role managerId');
      
      // Also include the manager themselves for self-assignment
      const manager = await User.findById(managerId, 'name email role');
      
      let assignableUsers = [];
      if (manager) {
        assignableUsers.push({
          id: manager._id,
          name: manager.name,
          email: manager.email,
          role: manager.role,
          isManager: true
        });
      }
      
      // Add team members
      assignableUsers.push(...teamMembers.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isTeamMember: true
      })));
      
      // If no team members, include other managers and team members as fallback within admin domain
      if (assignableUsers.length <= 1) {
        const fallbackUsers = await User.find({
          isActive: true,
          role: { $in: ['team_member', 'manager'] },
          ...baseAccessFilter
        }, 'name email role')
        .sort({ name: 1 });
        
        return res.json(fallbackUsers.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        })));
      }
      
      return res.json(assignableUsers);
      
    } else if (role === 'admin' || role === 'super_admin') {
      // Admins can assign to anyone except other admins/super_admins
      query.role = { $in: ['team_member', 'manager', 'client'] };
    }
    
    const users = await User.find(query, 'name email role')
      .sort({ name: 1 });
    
    res.json(users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add comment to task
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    const comment = {
      text: req.body.comment,
      userId: req.body.userId,
      createdAt: new Date(),
    };
    
    task.comments.push(comment);
    await task.save();
    
    res.json({
      ...task.toObject(),
      id: task._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update task progress
router.patch('/:id/progress', async (req, res) => {
  try {
    const { percentage, notes, userId, isEndOfDay } = req.body;
    const taskId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ error: 'percentage must be between 0 and 100' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Check if user is the assignee or has permission to update progress
    if (task.assigneeId.toString() !== userId && task.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'You can only update progress on tasks assigned to you or created by you' });
    }
    
    // Validate progress cannot go backwards
    if (percentage < task.currentProgress) {
      return res.status(400).json({ 
        error: 'Progress cannot go backwards', 
        currentProgress: task.currentProgress,
        attemptedProgress: percentage 
      });
    }
    
    // Check if task is already completed
    if (task.currentProgress === 100) {
      return res.status(400).json({ error: 'Cannot update progress on completed tasks' });
    }
    
    // Create progress update record
    const progressUpdate = {
      percentage,
      notes: notes || '',
      updatedBy: userId,
      updatedAt: new Date(),
      isEndOfDay: isEndOfDay || false
    };
    
    // Update task progress
    const updateData = {
      currentProgress: percentage,
      lastProgressUpdate: new Date()
    };
    
    // If progress reaches 100%, update status to completed
    if (percentage === 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }
    
    // Add to progress history
    if (!task.progressHistory) {
      task.progressHistory = [];
    }
    task.progressHistory.push(progressUpdate);
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { 
        ...updateData,
        progressHistory: task.progressHistory
      },
      { new: true }
    )
    .populate('clientId', 'name')
    .populate('assigneeId', 'name email')
    .populate('createdBy', 'name email')
    .populate('serviceId', 'name category')
    .populate('reassignedFrom', 'name email')
    .populate('reassignedBy', 'name email');
    
    // Log the progress update activity
    await new UserActivity({
      userId: userId,
      action: 'update_task_progress',
      description: `Updated progress on task "${task.title}" to ${percentage}%`,
      metadata: { 
        taskId: task._id,
        oldProgress: task.currentProgress,
        newProgress: percentage,
        isEndOfDay: isEndOfDay || false
      }
    }).save();
    
    // Get manager information for notification
    let managerId = null;
    if (task.assigneeId && task.assigneeId.toString() === userId) {
      // If assignee is updating progress, get their manager
      const assignee = await User.findById(userId);
      if (assignee && assignee.managerId) {
        managerId = assignee.managerId;
      }
    }
    
    res.json({
      ...updatedTask.toObject(),
      id: updatedTask._id,
      message: 'Progress updated successfully',
      managerId: managerId // Include manager ID for frontend notification
    });
  } catch (err) {
    console.error('Progress update error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get task progress history
router.get('/:id/progress-history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const taskId = req.params.id;
    
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (!task.progressHistory || task.progressHistory.length === 0) {
      return res.json({ progressHistory: [], currentProgress: task.currentProgress });
    }
    
    let filteredHistory = task.progressHistory;
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      filteredHistory = task.progressHistory.filter(update => {
        const updateDate = new Date(update.updatedAt);
        return updateDate >= start && updateDate <= end;
      });
    }
    
    // Sort by date (newest first)
    filteredHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Populate user information for each progress update
    const populatedHistory = await Promise.all(
      filteredHistory.map(async (update) => {
        const user = await User.findById(update.updatedBy, 'name email');
        return {
          ...update.toObject(),
          updatedBy: user ? { id: user._id, name: user.name, email: user.email } : null
        };
      })
    );
    
    res.json({
      progressHistory: populatedHistory,
      currentProgress: task.currentProgress,
      lastProgressUpdate: task.lastProgressUpdate
    });
  } catch (err) {
    console.error('Progress history error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get progress summary for manager dashboard
router.get('/progress-summary', async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.query;
    
    if (!managerId) {
      return res.status(400).json({ error: 'managerId is required' });
    }
    
    // Get team members under this manager
    const teamMembers = await User.find({ managerId }, '_id');
    const teamMemberIds = teamMembers.map(u => u._id);
    
    // Build query for tasks assigned to team members
    const query = { assigneeId: { $in: teamMemberIds } };
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      query.lastProgressUpdate = {};
      if (startDate) query.lastProgressUpdate.$gte = new Date(startDate);
      if (endDate) query.lastProgressUpdate.$lte = new Date(endDate);
    }
    
    const tasks = await Task.find(query)
      .populate('assigneeId', 'name email')
      .populate('clientId', 'name')
      .select('title currentProgress lastProgressUpdate assigneeId clientId status');
    
    // Group by team member
    const summary = {};
    teamMemberIds.forEach(memberId => {
      const memberTasks = tasks.filter(task => task.assigneeId._id.toString() === memberId.toString());
      const member = teamMembers.find(m => m._id.toString() === memberId.toString());
      
      summary[memberId] = {
        memberId: memberId,
        memberName: member ? member.name : 'Unknown',
        totalTasks: memberTasks.length,
        completedTasks: memberTasks.filter(t => t.status === 'completed').length,
        averageProgress: memberTasks.length > 0 
          ? Math.round(memberTasks.reduce((sum, t) => sum + t.currentProgress, 0) / memberTasks.length)
          : 0,
        recentUpdates: memberTasks
          .filter(t => t.lastProgressUpdate)
          .sort((a, b) => new Date(b.lastProgressUpdate) - new Date(a.lastProgressUpdate))
          .slice(0, 5) // Last 5 updates
      };
    });
    
    res.json({ summary });
  } catch (err) {
    console.error('Progress summary error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 