const express = require('express');
const Query = require('../schemas/Query');
const router = express.Router();

// Create a new query
router.post('/', async (req, res) => {
  try {
    const query = new Query(req.body);
    await query.save();
    res.status(201).json(query);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all queries
router.get('/', async (req, res) => {
  const queries = await Query.find();
  res.json(queries.map(query => ({
    ...query.toObject(),
    id: query._id,
  })));
});

// Get query by ID
router.get('/:id', async (req, res) => {
  const query = await Query.findById(req.params.id);
  if (!query) return res.status(404).json({ error: 'Query not found' });
  res.json({
    ...query.toObject(),
    id: query._id,
  });
});

// Update query
router.put('/:id', async (req, res) => {
  const query = await Query.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!query) return res.status(404).json({ error: 'Query not found' });
  res.json(query);
});

// Delete query
router.delete('/:id', async (req, res) => {
  const query = await Query.findByIdAndDelete(req.params.id);
  if (!query) return res.status(404).json({ error: 'Query not found' });
  res.json({ message: 'Query deleted' });
});

// Update query status
router.patch('/:id/status', async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!query) return res.status(404).json({ error: 'Query not found' });
    res.json({
      ...query.toObject(),
      id: query._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add response to query
router.post('/:id/responses', async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });
    
    const response = {
      text: req.body.response,
      userId: req.body.userId,
      userName: req.body.userName,
      createdAt: new Date(),
    };
    
    query.responses.push(response);
    await query.save();
    
    res.json({
      ...query.toObject(),
      id: query._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 