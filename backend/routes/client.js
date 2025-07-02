const express = require('express');
const Client = require('../schemas/Client');
const router = express.Router();

// Create a new client
router.post('/', async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json({
      ...client.toObject(),
      id: client._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all clients with role-based filtering
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.query;
    let query = {};

    // Role-based filtering
    if (role === 'client') {
      // Clients can only see their own data
      query = { _id: userId };
    } else if (role === 'team_member') {
      // Team members can see clients assigned to them
      query = { assignedTeamMembers: userId };
    } else if (role === 'manager') {
      // Managers can see clients assigned to them
      query = { managerId: userId };
    }
    // Admin can see all clients (no filter)

    const clients = await Client.find(query);
    res.json(clients.map(client => ({
      ...client.toObject(),
      id: client._id,
      firmsCount: 0, // This would need to be calculated
      complianceRate: 85, // This would need to be calculated
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({
      ...client.toObject(),
      id: client._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({
      ...client.toObject(),
      id: client._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get client compliance data
router.get('/:id/compliance', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Mock compliance data
    const complianceData = {
      recurring: [
        { name: 'GST Return', description: 'Monthly GST return filing', frequency: 'monthly', nextDue: '2024-02-20' },
        { name: 'TDS Payment', description: 'Quarterly TDS payment', frequency: 'quarterly', nextDue: '2024-03-31' }
      ],
      upcoming: [
        { name: 'Income Tax Return', description: 'Annual ITR filing', dueDate: '2024-07-31', priority: 'high' },
        { name: 'Audit Report', description: 'Statutory audit completion', dueDate: '2024-09-30', priority: 'medium' }
      ],
      overdue: [
        { name: 'PF Payment', description: 'Employee PF contribution', dueDate: '2024-01-15', priority: 'high' }
      ]
    };
    
    res.json(complianceData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 