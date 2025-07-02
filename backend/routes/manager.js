const express = require('express');
const Manager = require('../schemas/Manager');
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
  const managers = await Manager.find();
  res.json(managers);
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