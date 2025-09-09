const express = require('express');
const Manager = require('../schemas/Manager');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
const router = express.Router();

// Create a new manager
router.post('/', async (req, res) => {
  try {
    const manager = new Manager(req.body);
    await manager.save();
    res.status(201).json(manager);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all managers
router.get('/', async (req, res) => {
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
    
    const managers = await Manager.find(accessFilter);
    res.json(managers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get manager by ID
router.get('/:id', async (req, res) => {
  const manager = await Manager.findById(req.params.id);
  if (!manager) return res.status(404).json({ error: 'Manager not found' });
  res.json(manager);
});

// Update manager
router.put('/:id', async (req, res) => {
  const manager = await Manager.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!manager) return res.status(404).json({ error: 'Manager not found' });
  res.json(manager);
});

// Delete manager
router.delete('/:id', async (req, res) => {
  const manager = await Manager.findByIdAndDelete(req.params.id);
  if (!manager) return res.status(404).json({ error: 'Manager not found' });
  res.json({ message: 'Manager deleted' });
});

module.exports = router; 