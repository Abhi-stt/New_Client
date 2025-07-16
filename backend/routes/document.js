const express = require('express');
const multer = require('multer');
const Document = require('../schemas/Document');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure Multer storage (this stores files in 'uploads/' folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Configure Nodemailer (replace with your SMTP config)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware to check 2FA for confidential documents
async function require2FAForConfidentialDoc(req, res, next) {
  try {
    const documentId = req.params.id || req.body.documentId;
    const userId = req.headers['x-user-id'] || req.body.userId; // Adjust as needed for your auth/session
    const userRole = req.headers['x-user-role'] || req.body.userRole; // Add this!
    if (!documentId || !userId) return res.status(400).json({ error: 'Missing documentId or userId' });
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    // Only require 2FA for team members and managers and confidential docs
    if (doc.confidential && (userRole === 'team_member' || userRole === 'manager')) {
      const user = await require('../schemas/User').findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      // Lockout logic
      if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) {
        return res.status(403).json({ error: 'Account locked due to multiple failed 2FA attempts. Try again later.' });
      }
      const code = req.headers['x-2fa-code'] || req.body.twoFactorCode;
      if (!user.twoFactorEnabled || !user.twoFactorCode) {
        return res.status(403).json({ error: '2FA not set up. Contact admin/manager.' });
      }
      if (!code || code !== user.twoFactorCode) {
        user.twoFactorFailedAttempts = (user.twoFactorFailedAttempts || 0) + 1;
        if (user.twoFactorFailedAttempts >= 5) {
          user.twoFactorLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
          await user.save();
          return res.status(403).json({ error: 'Too many failed 2FA attempts. Account locked for 30 minutes.' });
        }
        await user.save();
        return res.status(401).json({ error: 'Invalid 2FA code.' });
      }
      // Success: reset failed attempts
      user.twoFactorFailedAttempts = 0;
      user.twoFactorLockedUntil = null;
      await user.save();
      next();
    } else {
      // For admin, client, or non-confidential docs, allow access
      return next();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create a new document
router.post('/', async (req, res) => {
  try {
    const document = new Document(req.body);
    await document.save();
    res.status(201).json({
      ...document.toObject(),
      id: document._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all documents (no role-based filtering for testing)
router.get('/', async (req, res) => {
  try {
    // For testing, ignore role and userId, return all documents
    const documents = await Document.find({})
      .populate('clientId', 'name')
      .populate('firmId', 'name')
      .populate('uploadedBy', 'name');
    res.json(documents.map(doc => ({
      ...doc.toObject(),
      id: doc._id,
      clientName: doc.clientId?.name || 'Unknown Client',
      firmName: doc.firmId?.name || null,
      uploadedBy: doc.uploadedBy?.name || 'Unknown User',
      uploadedDate: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown'
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json({
      ...document.toObject(),
      id: document._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update document (e.g., mark as confidential)
router.patch('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// File upload route
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { name, description, type, clientId, firmId, syncWithGoogleSheets, syncWithSharePoint, googleSheetsUrl, sharePointUrl, userId } = req.body;
    const files = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    }));

    // Accept clientId as either a Client _id or a User _id (for client users without a Client entity)
    // No strict validation on clientId
    const document = new Document({
      name,
      description,
      type,
      clientId, // can be a Client or User _id
      firmId,
      syncWithGoogleSheets,
      syncWithSharePoint,
      googleSheetsUrl,
      sharePointUrl,
      files,
      uploadedBy: userId,
      status: 'pending'
    });
    await document.save();
    res.status(201).json({
      ...document.toObject(),
      id: document._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Document request route
router.post('/request', async (req, res) => {
  try {
    const { clientId, clientEmail, name, description, type, dueDate, reminderLimit } = req.body;
    // Generate a secure, unique token
    const token = crypto.randomBytes(32).toString('hex');
    // Set expiry (e.g., 7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // Create document entry with all required fields
    const document = new Document({
      name,
      description,
      type,
      clientId,
      clientEmail,
      dueDate,
      reminderLimit: reminderLimit || 3,
      reminderCount: 0,
      uploadLinkToken: token,
      uploadLinkExpiresAt: expiresAt,
      uploadLinkUsed: false,
      status: 'pending',
      files: [],
      syncWithGoogleSheets: false,
      syncWithSharePoint: false,
    });
    await document.save();
    console.log('Document request created:', document);
    // Build upload link (adjust URL as needed)
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const uploadUrl = `${frontendBaseUrl}/documents/upload/${token}`;
    // Send email to client
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: clientEmail,
      subject: `Document Request: ${name}`,
      html: `<p>You have a new document request.</p>
             <p><b>Description:</b> ${description || 'N/A'}</p>
             <p><b>Due Date:</b> ${new Date(dueDate).toLocaleString()}</p>
             <p>Please upload your document using the secure link below (valid until ${expiresAt.toLocaleString()}):</p>
             <p><a href="${uploadUrl}">${uploadUrl}</a></p>`
    });
    res.status(201).json({
      message: 'Document request created and email sent',
      documentId: document._id,
      uploadUrl,
      expiresAt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Example: Protect document download/view route
router.get('/:id/download', require2FAForConfidentialDoc, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    
    // In a real implementation, you'd stream the file
    // For now, we'll just return the document info
    res.json({
      ...document.toObject(),
      id: document._id,
      downloadUrl: document.files?.[0]?.url || null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Secure upload via token
router.post('/upload/:token', upload.array('files'), async (req, res) => {
  try {
    const { token } = req.params;
    console.log('Received upload for token:', token);
    const document = await Document.findOne({ uploadLinkToken: token });
    console.log('Document found:', document);
    if (!document) {
      return res.status(404).json({ error: 'Invalid upload link.' });
    }
    if (document.uploadLinkUsed) {
      return res.status(400).json({ error: 'This upload link has already been used.' });
    }
    if (!document.uploadLinkExpiresAt || document.uploadLinkExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This upload link has expired.' });
    }
    // Accept file uploads
    const files = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    }));
    document.files = files;
    document.uploadLinkUsed = true;
    document.status = 'pending'; // or 'uploaded', depending on your workflow
    await document.save();
    res.status(200).json({ message: 'Document uploaded successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Validate upload link in real time
router.get('/validate-upload-link/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const document = await Document.findOne({ uploadLinkToken: token });
    if (!document) {
      return res.status(404).json({ error: 'Invalid upload link.' });
    }
    if (document.uploadLinkUsed) {
      return res.status(400).json({ error: 'This upload link has already been used.' });
    }
    if (!document.uploadLinkExpiresAt || document.uploadLinkExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This upload link has expired.' });
    }
    return res.status(200).json({ valid: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Validate upload token before upload
router.get('/upload/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const document = await Document.findOne({ uploadLinkToken: token });
    if (!document) {
      return res.status(404).json({ error: 'Invalid upload link.' });
    }
    if (document.uploadLinkUsed) {
      return res.status(400).json({ error: 'This upload link has already been used.' });
    }
    if (!document.uploadLinkExpiresAt || document.uploadLinkExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This upload link has expired.' });
    }
    return res.status(200).json({ valid: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Link/unlink Google Sheets or SharePoint to a document
router.patch('/:id/link-sync', async (req, res) => {
  try {
    const update = {}
    if ('syncWithGoogleSheets' in req.body) update.syncWithGoogleSheets = req.body.syncWithGoogleSheets
    if ('googleSheetsUrl' in req.body) update.googleSheetsUrl = req.body.googleSheetsUrl
    if ('syncWithSharePoint' in req.body) update.syncWithSharePoint = req.body.syncWithSharePoint
    if ('sharePointUrl' in req.body) update.sharePointUrl = req.body.sharePointUrl
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No sync fields provided' })
    update.syncStatus = 'pending'
    const doc = await Document.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Trigger manual sync (placeholder logic)
router.post('/:id/sync', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    // Placeholder: simulate sync
    doc.syncStatus = 'synced'
    doc.lastSyncedAt = new Date()
    await doc.save()
    res.json({ message: 'Sync completed', syncStatus: doc.syncStatus, lastSyncedAt: doc.lastSyncedAt })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router; 