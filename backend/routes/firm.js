const express = require('express');
const Firm = require('../schemas/Firm');
const router = express.Router();

// Create a new firm
router.post('/', async (req, res) => {
  try {
    const firm = new Firm(req.body);
    await firm.save();
    res.status(201).json({
      ...firm.toObject(),
      id: firm._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all firms with role-based filtering
router.get('/', async (req, res) => {
  try {
    const { clientId, role, userId } = req.query;
    let query = {};

    // Role-based filtering
    if (clientId) {
      // If clientId is provided, filter by that
      query = { clientId };
    } else if (role === 'client') {
      // Clients can only see their own firms
      query = { clientId: userId };
    } else if (role === 'team_member') {
      // Team members can see firms of clients assigned to them
      // This would need to be implemented based on your data structure
      query = {};
    } else if (role === 'manager') {
      // Managers can see firms of clients assigned to them
      // This would need to be implemented based on your data structure
      query = {};
    }
    // Admin can see all firms (no filter)

    const firms = await Firm.find(query);
    res.json(firms.map(firm => ({
      ...firm.toObject(),
      id: firm._id,
      teamCount: 0, // This would need to be calculated
      complianceRate: 90, // This would need to be calculated
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get firm by ID
router.get('/:id', async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.json({
      ...firm.toObject(),
      id: firm._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update firm
router.put('/:id', async (req, res) => {
  try {
    const firm = await Firm.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.json({
      ...firm.toObject(),
      id: firm._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete firm
router.delete('/:id', async (req, res) => {
  try {
    const firm = await Firm.findByIdAndDelete(req.params.id);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.json({ message: 'Firm deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get firm details
router.get('/:id/details', async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    
    // Mock data for firm details
    const firmDetails = {
      details: {
        ...firm.toObject(),
        id: firm._id,
      },
      team: [
        { id: '1', name: 'John Smith', role: 'CA', email: 'john@example.com' },
        { id: '2', name: 'Jane Doe', role: 'Assistant', email: 'jane@example.com' }
      ],
      documents: [
        { id: '1', name: 'GST Return Q3', type: 'GST', uploadedDate: '2024-01-10' },
        { id: '2', name: 'Bank Statement Dec', type: 'Bank Statement', uploadedDate: '2024-01-08' }
      ],
      compliance: [
        { id: '1', name: 'GST Filing', status: 'completed', dueDate: '2024-01-20' },
        { id: '2', name: 'TDS Payment', status: 'pending', dueDate: '2024-01-25' }
      ]
    };
    
    res.json(firmDetails);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 