const express = require('express');
const DemoRequest = require('../schemas/DemoRequest');
const router = express.Router();

// Request a demo
router.post('/request', async (req, res) => {
  try {
    const { name, email, phone, company } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !company) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Create and save demo request to database
    const demoRequest = new DemoRequest({
      name,
      email,
      phone,
      company,
      status: 'pending',
    });

    await demoRequest.save();

    // Log the demo request
    console.log('Demo request received:', demoRequest);

    // In production, you might want to:
    // 1. Send notification email to admin
    // 2. Send confirmation email to user

    res.status(201).json({
      message: 'Demo request submitted successfully',
      requestId: demoRequest._id,
    });
  } catch (err) {
    console.error('Demo request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all demo requests (admin only - add auth middleware in production)
router.get('/requests', async (req, res) => {
  try {
    const requests = await DemoRequest.find()
      .sort({ createdAt: -1 })
      .populate('contactedBy', 'name email');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
