const express = require('express');
const Task = require('../schemas/Task');
const router = express.Router();

// Create a new task
router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.query;
    let query = {};

    // Role-based filtering
    if (role === 'client') {
      // Clients can only see their own tasks (as clientId)
      query = { clientId: userId };
    } else if (role === 'team_member') {
      // Team members can see tasks assigned to them
      query = { assigneeId: userId };
    } else if (role === 'manager') {
      // Managers can see tasks for their team and clients
      // This requires fetching team members and clients assigned to the manager
      const User = require('../schemas/User');
      const Client = require('../schemas/Client');
      const teamMembers = await User.find({ managerId: userId }, '_id');
      const teamMemberIds = teamMembers.map(u => u._id);
      const clients = await Client.find({ managerId: userId }, '_id');
      const clientIds = clients.map(c => c._id);
      query = {
        $or: [
          { assigneeId: { $in: [userId, ...teamMemberIds] } },
          { clientId: { $in: clientIds } }
        ]
      };
    }
    // Admin can see all tasks (no filter)

    const tasks = await Task.find(query)
      .populate('clientId', 'name')
      .populate('assigneeId', 'name')
      .populate('createdBy', 'name');
    res.json(tasks.map(task => ({
      ...task.toObject(),
      id: task._id,
      clientName: task.clientId?.name || 'Unknown Client',
      assigneeName: task.assigneeId?.name || 'Unassigned',
      createdBy: task.createdBy?.name || 'Unknown User'
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
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({
      ...task.toObject(),
      id: task._id,
    });
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

module.exports = router; 