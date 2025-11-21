const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');
const EmailAccount = require('../schemas/EmailAccount');
const EmailForwardingRule = require('../schemas/EmailForwardingRule');
const EmailAuditLog = require('../schemas/EmailAuditLog');
const SyncedEmail = require('../schemas/SyncedEmail');
const User = require('../schemas/User');

// Get Gmail OAuth URL
router.get('/gmail/auth/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const authUrl = gmailService.getAuthUrl(userId);
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle Gmail OAuth callback
router.get('/gmail/callback', async (req, res) => {
  try {
    console.log('Gmail OAuth callback received');
    console.log('Query params:', req.query);
    
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      console.error('Missing code or userId in callback');
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: red;">Authorization Failed</h2>
            <p>Missing authorization code or user ID.</p>
            <p>You can close this window.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);
    }

    console.log('Exchanging code for tokens for user:', userId);
    const emailAccount = await gmailService.exchangeCodeForTokens(code, userId);
    console.log('Gmail account connected successfully:', emailAccount.email);
    
    // Redirect to frontend with success message
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3000';
    
    // Immediately redirect to frontend
    res.redirect(`${frontendUrl}/email?connected=true`);
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/email?error=${encodeURIComponent(error.message)}`);
  }
});

// Sync emails
router.post('/sync/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { maxResults = 50 } = req.body;
    
    const syncedEmails = await gmailService.syncEmails(userId, maxResults);
    res.json({ 
      message: 'Emails synced successfully',
      count: syncedEmails.length,
      emails: syncedEmails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's emails
router.get('/emails/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, sender, subject, isRead, hasAttachments } = req.query;
    
    const filters = {};
    if (sender) filters.sender = sender;
    if (subject) filters.subject = subject;
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (hasAttachments !== undefined) filters.hasAttachments = hasAttachments === 'true';
    
    const result = await gmailService.getUserEmails(userId, parseInt(page), parseInt(limit), filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark email as read
router.patch('/emails/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { isRead = true } = req.body;
    
    const email = await SyncedEmail.findByIdAndUpdate(
      emailId,
      { isRead },
      { new: true }
    );
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Log the action
    await EmailAuditLog.create({
      userId: email.userId,
      action: 'read',
      emailId: email._id,
      details: { subject: email.subject }
    });
    
    res.json({ message: 'Email status updated', email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create forwarding rule
router.post('/forwarding-rules', async (req, res) => {
  try {
    const { userId, ruleName, conditions, actions } = req.body;
    
    const rule = await EmailForwardingRule.create({
      userId,
      ruleName,
      conditions,
      actions,
      isActive: true
    });
    
    // Log rule creation
    await EmailAuditLog.create({
      userId,
      action: 'rule_created',
      ruleId: rule._id,
      details: { ruleName }
    });
    
    res.status(201).json({ message: 'Forwarding rule created', rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's forwarding rules
router.get('/forwarding-rules/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const rules = await EmailForwardingRule.find({ userId }).sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update forwarding rule
router.put('/forwarding-rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    
    const rule = await EmailForwardingRule.findByIdAndUpdate(
      ruleId,
      updates,
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    // Log rule update
    await EmailAuditLog.create({
      userId: rule.userId,
      action: 'rule_updated',
      ruleId: rule._id,
      details: { ruleName: rule.ruleName }
    });
    
    res.json({ message: 'Rule updated', rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete forwarding rule
router.delete('/forwarding-rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const rule = await EmailForwardingRule.findByIdAndDelete(ruleId);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    // Log rule deletion
    await EmailAuditLog.create({
      userId: rule.userId,
      action: 'rule_deleted',
      ruleId: rule._id,
      details: { ruleName: rule.ruleName }
    });
    
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get email account status
router.get('/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const account = await EmailAccount.findOne({ userId, provider: 'gmail' });
    
    if (!account) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      email: account.email,
      isActive: account.isActive,
      lastSyncAt: account.lastSyncAt,
      syncStatus: account.syncStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect email account
router.delete('/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete the account completely to force reconnection
    const account = await EmailAccount.findOneAndDelete(
      { userId, provider: 'gmail' }
    );
    
    if (!account) {
      return res.status(404).json({ error: 'No email account found' });
    }
    
    // Also delete all synced emails for this account
    await SyncedEmail.deleteMany({ emailAccountId: account._id });
    
    // Log disconnection
    await EmailAuditLog.create({
      userId,
      action: 'disconnect',
      emailAccountId: account._id,
      details: { to: account.email }
    });
    
    res.json({ message: 'Email account disconnected and data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs
router.get('/audit-logs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const logs = await EmailAuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await EmailAuditLog.countDocuments({ userId });
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test OAuth configuration
router.get('/test-oauth', (req, res) => {
  try {
    const authUrl = gmailService.getAuthUrl('test-user');
    res.json({ 
      message: 'OAuth configuration working',
      authUrl: authUrl,
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'Using default localhost',
      environment: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'Not set',
      scopes: authUrl.includes('gmail.readonly') ? 'Includes Gmail scope' : 'Missing Gmail scope'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forward email manually
router.post('/forward', async (req, res) => {
  try {
    const { emailId, userId, forwardType, recipients, addNote } = req.body;
    
    console.log('Forward email request:', { emailId, userId, forwardType, recipients, addNote });
    
    // Get the email
    const email = await SyncedEmail.findById(emailId);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Get recipient emails
    const recipientEmails = [];
    const recipientDetails = [];
    
    for (const recipient of recipients) {
      if (recipient.type === 'email') {
        recipientEmails.push(recipient.value);
        recipientDetails.push({ type: 'email', value: recipient.value });
      } else if (recipient.type === 'role') {
        const roleUsers = await User.find({ 
          role: recipient.value,
          isActive: true 
        }).select('email name');
        
        if (roleUsers.length === 0) {
          console.log(`No users found for role: ${recipient.value}`);
          continue;
        }
        
        recipientEmails.push(...roleUsers.map(user => user.email));
        recipientDetails.push({ 
          type: 'role', 
          value: recipient.value, 
          count: roleUsers.length,
          users: roleUsers.map(user => ({ email: user.email, name: user.name }))
        });
      }
    }
    
    console.log('Resolved recipients:', { recipientEmails, recipientDetails });
    
    if (recipientEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found. Please check role names or email addresses.' });
    }
    
    // Prepare email content
    const subject = `FWD: ${email.subject}`;
    let body = '';
    
    if (forwardType === 'full') {
      const emailContent = email.htmlBody || email.textBody || email.body || 'No content available';
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0 0 10px 0; color: #2563eb;">Forwarded Email</h3>
            <p style="margin: 5px 0;"><strong>From:</strong> ${email.sender}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${email.recipient}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(email.receivedAt).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${email.subject}</p>
          </div>
          <div style="padding: 20px; background-color: white; border: 1px solid #e5e7eb;">
            ${emailContent}
          </div>
          ${addNote ? `<div style="background-color: #fef3c7; padding: 15px; margin-top: 10px; border-left: 4px solid #f59e0b;"><strong>Note:</strong> ${addNote}</div>` : ''}
        </div>
      `;
    } else {
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0 0 10px 0; color: #2563eb;">Email Summary</h3>
            <p style="margin: 5px 0;"><strong>From:</strong> ${email.sender}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${email.subject}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(email.receivedAt).toLocaleString()}</p>
          </div>
          <div style="padding: 20px; background-color: white; border: 1px solid #e5e7eb;">
            <p><strong>Preview:</strong></p>
            <p style="color: #6b7280; font-style: italic;">${email.bodyPreview || 'No preview available'}</p>
          </div>
          ${addNote ? `<div style="background-color: #fef3c7; padding: 15px; margin-top: 10px; border-left: 4px solid #f59e0b;"><strong>Note:</strong> ${addNote}</div>` : ''}
        </div>
      `;
    }
    
    // Send emails using Gmail API
    for (const recipientEmail of recipientEmails) {
      await gmailService.sendEmail(userId, {
        to: recipientEmail,
        subject,
        htmlBody: body
      });
    }
    
    // Update email as forwarded
    email.isForwarded = true;
    email.forwardedAt = new Date();
    await email.save();
    
    // Log forwarding action
    await EmailAuditLog.create({
      userId,
      action: 'forward',
      emailId: email._id,
      details: {
        from: email.sender,
        to: recipientEmails.join(', '),
        subject: email.subject,
        forwardType,
        addNote
      }
    });
    
    res.json({ 
      message: 'Email forwarded successfully',
      recipients: recipientEmails,
      recipientDetails: recipientDetails,
      forwardedTo: recipientEmails.length,
      forwardType: forwardType
    });
  } catch (error) {
    console.error('Error forwarding email:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
