const express = require('express');
const Compliance = require('../schemas/Compliance');
const router = express.Router();

// Get all compliance items for a client
router.get('/client/:clientId', async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    let query = { clientId: req.params.clientId, isActive: true };
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    const complianceItems = await Compliance.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });
    
    res.json(complianceItems);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get compliance item by ID
router.get('/:id', async (req, res) => {
  try {
    const complianceItem = await Compliance.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');
    
    if (!complianceItem) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }
    
    res.json(complianceItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create new compliance item
router.post('/', async (req, res) => {
  try {
    const complianceItem = new Compliance(req.body);
    await complianceItem.save();
    
    // Populate the response
    await complianceItem.populate('assignedTo', 'name email');
    await complianceItem.populate('createdBy', 'name email');
    
    res.status(201).json(complianceItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update compliance item
router.put('/:id', async (req, res) => {
  try {
    const complianceItem = await Compliance.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email').populate('createdBy', 'name email');
    
    if (!complianceItem) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }
    
    res.json(complianceItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark compliance item as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const { completionNotes, attachments } = req.body;
    
    const complianceItem = await Compliance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date(),
        completedBy: req.body.completedBy,
        completionNotes,
        attachments: attachments || []
      },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email').populate('completedBy', 'name email');
    
    if (!complianceItem) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }
    
    // If it's recurring, create next instance
    if (complianceItem.isRecurring) {
      const nextDueDate = complianceItem.calculateNextDueDate();
      if (nextDueDate) {
        const nextInstance = new Compliance({
          ...complianceItem.toObject(),
          _id: undefined,
          status: 'pending',
          dueDate: nextDueDate,
          nextDueDate: null,
          completedAt: null,
          completedBy: null,
          completionNotes: null,
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await nextInstance.save();
      }
    }
    
    res.json(complianceItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete compliance item (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const complianceItem = await Compliance.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!complianceItem) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }
    
    res.json({ message: 'Compliance item deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get overdue compliance items
router.get('/overdue/client/:clientId', async (req, res) => {
  try {
    const today = new Date();
    const overdueItems = await Compliance.find({
      clientId: req.params.clientId,
      isActive: true,
      dueDate: { $lt: today },
      status: { $ne: 'completed' }
    }).populate('assignedTo', 'name email').sort({ dueDate: 1 });
    
    res.json(overdueItems);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get upcoming compliance items (next 30 days)
router.get('/upcoming/client/:clientId', async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const upcomingItems = await Compliance.find({
      clientId: req.params.clientId,
      isActive: true,
      dueDate: { $gte: today, $lte: thirtyDaysFromNow },
      status: { $ne: 'completed' }
    }).populate('assignedTo', 'name email').sort({ dueDate: 1 });
    
    res.json(upcomingItems);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get compliance summary for a client
router.get('/summary/client/:clientId', async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const [
      total,
      completed,
      pending,
      overdue,
      upcoming,
      byCategory,
      byPriority
    ] = await Promise.all([
      Compliance.countDocuments({ clientId: req.params.clientId, isActive: true }),
      Compliance.countDocuments({ clientId: req.params.clientId, isActive: true, status: 'completed' }),
      Compliance.countDocuments({ clientId: req.params.clientId, isActive: true, status: 'pending' }),
      Compliance.countDocuments({ 
        clientId: req.params.clientId, 
        isActive: true, 
        dueDate: { $lt: today },
        status: { $ne: 'completed' }
      }),
      Compliance.countDocuments({ 
        clientId: req.params.clientId, 
        isActive: true, 
        dueDate: { $gte: today, $lte: thirtyDaysFromNow },
        status: { $ne: 'completed' }
      }),
      Compliance.aggregate([
        { $match: { clientId: req.params.clientId, isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Compliance.aggregate([
        { $match: { clientId: req.params.clientId, isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);
    
    const summary = {
      total,
      completed,
      pending,
      overdue,
      upcoming,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
    
    res.json(summary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
