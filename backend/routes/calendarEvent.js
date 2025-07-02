const express = require('express');
const CalendarEvent = require('../schemas/CalendarEvent');
const router = express.Router();

// Create a new calendar event
router.post('/', async (req, res) => {
  try {
    const event = new CalendarEvent(req.body);
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
    let query = {};

    // Role-based filtering
    if (role === 'client') {
      // Clients can only see their own events
      query = { clientId: userId };
    } else if (role === 'team_member') {
      // Team members can see events assigned to them
      query = { assigneeId: userId };
    } else if (role === 'manager') {
      // Managers can see events for their team and clients
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
    // Admin can see all events (no filter)

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