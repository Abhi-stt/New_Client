const express = require('express');
const CalendarEvent = require('../schemas/CalendarEvent');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
const router = express.Router();

// Create a new calendar event
router.post('/', async (req, res) => {
  try {
    // Get current user for ownership
    const currentUser = req.user || { role: 'guest', id: null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Set ownership fields
    const ownershipFields = setOwnershipFields(currentUser.role, currentUser.id, userAdminId);
    
    const event = new CalendarEvent({
      ...req.body,
      ...ownershipFields
    });
    
    await event.save();
    res.status(201).json({
      ...event.toObject(),
      id: event._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all calendar events with role-based filtering
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
      // Clients can only see their own events within their admin domain
      query = { 
        adminId: userAdminId,
        clientId: userId 
      };
    } else if (role === 'team_member') {
      // Team members can see events assigned to them within their admin domain
      query = { 
        adminId: userAdminId,
        assigneeId: userId 
      };
    } else if (role === 'manager') {
      // Managers can see events for their team and clients within their admin domain
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
      // Super admin can see all events across all domains
      query = {};
    } else {
      // Admin can see all events in their domain only
      const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
      query = accessFilter;
    }

    const events = await CalendarEvent.find(query)
      .populate('clientId', 'name')
      .populate('assigneeId', 'name')
      .populate('createdBy', 'name');
    
    res.json(events.map(event => ({
      ...event.toObject(),
      id: event._id,
      clientName: event.clientId?.name || 'Unknown Client',
      assigneeName: event.assigneeId?.name || 'Unassigned',
      createdBy: event.createdBy?.name || 'Unknown User'
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get calendar event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({
      ...event.toObject(),
      id: event._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update calendar event
router.put('/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({
      ...event.toObject(),
      id: event._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete calendar event
router.delete('/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 