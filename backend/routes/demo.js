const express = require('express');
const router = express.Router();

// In-memory storage for demo requests (you can replace this with a database schema if needed)
// For production, consider creating a DemoRequest schema
const demoRequests = [];

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

    // Create demo request object
    const demoRequest = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      company,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    // Store the demo request (in production, save to database)
    demoRequests.push(demoRequest);

    // Log the demo request
    console.log('Demo request received:', demoRequest);

    // In production, you might want to:
    // 1. Save to database
    // 2. Send notification email to admin
    // 3. Send confirmation email to user

    res.status(201).json({
      message: 'Demo request submitted successfully',
      requestId: demoRequest.id,
    });
  } catch (err) {
    console.error('Demo request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all demo requests (admin only - add auth middleware in production)
router.get('/requests', async (req, res) => {
  try {
    res.json({ requests: demoRequests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
