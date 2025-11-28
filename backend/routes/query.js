const express = require('express');
const Query = require('../schemas/Query');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
const router = express.Router();

// Create a new query
router.post('/', async (req, res) => {
  try {
    // Get current user for ownership (from query params or middleware)
    const { role, userId } = req.query;
    const currentUser = req.user || { 
      role: role || 'guest', 
      id: userId || null 
    };
    
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Set ownership fields
    const ownershipFields = setOwnershipFields(currentUser.role, currentUser.id, userAdminId);
    
    const query = new Query({
      ...req.body,
      ...ownershipFields,
      createdByRole: currentUser.role
    });
    
    await query.save();
    res.status(201).json(query);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all queries
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
    
    let queries = await Query.find(accessFilter)
      .sort({ createdAt: -1 }); // Sort by most recent first

    const currentUserId = currentUser.id?.toString();

    queries = queries.filter(query => {
      const createdById = query.createdBy?.toString();
      const createdByRole = query.createdByRole || (createdById === query.adminId?.toString() ? 'admin' : 'client');

      if (currentUser.role === 'super_admin') {
        return createdByRole === 'admin';
      }

      if (currentUser.role === 'admin') {
        if (createdById === currentUserId) return true;
        return ['manager', 'team_member', 'client'].includes(createdByRole);
      }

      if (['manager', 'team_member', 'client'].includes(currentUser.role)) {
        return createdById === currentUserId;
      }

      return false;
    });
      
    res.json(queries.map(query => ({
      ...query.toObject(),
      id: query._id,
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
    const { role, userId } = req.query;
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });

    const createdByRole = query.createdByRole || (query.createdBy?.toString() === query.adminId?.toString() ? 'admin' : 'client');

    const canUpdateStatus =
      (currentUser.role === 'super_admin' && createdByRole === 'admin') ||
      (currentUser.role === 'admin' && ['manager', 'team_member', 'client'].includes(createdByRole));

    if (!canUpdateStatus) {
      return res.status(403).json({ error: 'You are not allowed to update this ticket.' });
    }

    query.status = req.body.status;
    await query.save();

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
    const { role, userId } = req.query;
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });
    
    const createdByRole = query.createdByRole || (query.createdBy?.toString() === query.adminId?.toString() ? 'admin' : 'client');
    const canRespond =
      (currentUser.role === 'super_admin' && createdByRole === 'admin') ||
      (currentUser.role === 'admin' && ['manager', 'team_member', 'client'].includes(createdByRole));

    if (!canRespond) {
      return res.status(403).json({ error: 'Only admins can reply to these tickets.' });
    }
    
    const response = {
      text: req.body.response,
      userId: currentUser.id,
      userName: req.body.userName,
      userRole: currentUser.role,
      createdAt: new Date(),
    };
    
    query.responses = query.responses || [];
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