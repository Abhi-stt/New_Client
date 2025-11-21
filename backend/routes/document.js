const express = require('express');
const multer = require('multer');
const Document = require('../schemas/Document');
const User = require('../schemas/User');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
const googleSheetsService = require('../services/googleSheetsService');
const sharePointService = require('../services/sharePointService');
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
    const { role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Build access filter for admin domain isolation
    const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
    
    const documents = await Document.find(accessFilter)
      .populate('clientId', 'name')
      .populate('firmId', 'name')
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 }); // Sort by most recent first
      
    res.json(documents.map(doc => ({
      ...doc.toObject(),
      id: doc._id,
      clientName: doc.clientId?.name || 'Unknown Client',
      firmName: doc.firmId?.name || null,
      uploadedBy: doc.uploadedBy?.name || 'Unknown User',
      uploadedDate: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown',
      // Include sync URLs so they're visible in the UI
      syncWithGoogleSheets: doc.syncWithGoogleSheets || false,
      googleSheetsUrl: doc.googleSheetsUrl || null,
      syncWithSharePoint: doc.syncWithSharePoint || false,
      sharePointUrl: doc.sharePointUrl || null,
      syncStatus: doc.syncStatus || null,
      lastSyncedAt: doc.lastSyncedAt || null
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
    const { name, description, type, clientId, teamMemberId, firmId, syncWithGoogleSheets, syncWithSharePoint, googleSheetsUrl, sharePointUrl, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for document upload' });
    }
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Document name and type are required' });
    }
    
    // Get admin domain for the uploader
    const userAdminId = await getUserAdminId(userId);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }
    
    const files = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    }));

    // Set ownership fields for data isolation
    const ownershipFields = setOwnershipFields('admin', userId, userAdminId);

    // Accept clientId and teamMemberId as optional - only include if provided and not empty
    const documentData = {
      name,
      description: description || '',
      type,
      syncWithGoogleSheets: syncWithGoogleSheets === 'true' || syncWithGoogleSheets === true,
      syncWithSharePoint: syncWithSharePoint === 'true' || syncWithSharePoint === true,
      googleSheetsUrl: googleSheetsUrl || '',
      sharePointUrl: sharePointUrl || '',
      files,
      uploadedBy: userId,
      status: 'pending',
      ...ownershipFields
    };
    
    // Only add clientId if provided and not empty
    if (clientId && clientId !== 'none' && clientId !== '') {
      documentData.clientId = clientId;
    }
    
    // Only add firmId if provided and not empty
    if (firmId && firmId !== 'none' && firmId !== '') {
      documentData.firmId = firmId;
    }
    
    // Note: teamMemberId is not in Document schema, but we can store it in metadata if needed
    // For now, we'll just ignore it as it's not part of the schema
    
    const document = new Document(documentData);
    
    await document.save();
    
    // Auto-sync if enabled
    if ((document.syncWithGoogleSheets && document.googleSheetsUrl) || 
        (document.syncWithSharePoint && document.sharePointUrl)) {
      try {
        const user = await User.findById(userId);
        if (user) {
          // Sync to Google Sheets
          if (document.syncWithGoogleSheets && document.googleSheetsUrl && user.googleOAuth?.accessToken) {
            try {
              await googleSheetsService.appendDocumentRow(user, User, document, document.googleSheetsUrl);
              document.syncStatus = 'synced';
              document.lastSyncedAt = new Date();
              await document.save();
            } catch (syncError) {
              console.error('Auto-sync to Google Sheets failed:', syncError);
              document.syncStatus = 'error';
              await document.save();
            }
          }
          
          // Sync to SharePoint
          if (document.syncWithSharePoint && document.sharePointUrl && user.microsoftOAuth?.accessToken) {
            try {
              await sharePointService.syncDocumentMetadata(user, User, document, document.sharePointUrl);
              if (document.files && document.files.length > 0 && document.files[0].url) {
                const filePath = document.files[0].url.replace(/^\//, '');
                await sharePointService.uploadDocumentToSharePoint(user, User, document, document.sharePointUrl, filePath);
              }
              if (document.syncStatus !== 'synced') {
                document.syncStatus = 'synced';
                document.lastSyncedAt = new Date();
                await document.save();
              }
            } catch (syncError) {
              console.error('Auto-sync to SharePoint failed:', syncError);
              if (document.syncStatus !== 'synced') {
                document.syncStatus = 'error';
                await document.save();
              }
            }
          }
        }
      } catch (autoSyncError) {
        console.error('Auto-sync error (non-blocking):', autoSyncError);
        // Don't fail the upload if sync fails
      }
    }
    
    res.status(201).json({
      ...document.toObject(),
      id: document._id,
    });
  } catch (err) {
    console.error('Document upload error:', err);
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

// Get user's OAuth connection status
router.get('/sync-status', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id']
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({
      google: {
        connected: !!(user.googleOAuth?.accessToken),
        email: user.googleOAuth?.connectedEmail || null
      },
      microsoft: {
        connected: !!(user.microsoftOAuth?.accessToken),
        email: user.microsoftOAuth?.connectedEmail || null
      }
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Disconnect OAuth accounts
router.post('/disconnect-google', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id']
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    await googleSheetsService.disconnect(user)
    res.json({ success: true, message: 'Google account disconnected' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/disconnect-sharepoint', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id']
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    await sharePointService.disconnect(user)
    res.json({ success: true, message: 'Microsoft account disconnected' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

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
      .populate('clientId', 'name')
      .populate('firmId', 'name')
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Trigger manual sync - Actual implementation
router.post('/:id/sync', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id']
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const doc = await Document.findById(req.params.id)
      .populate('clientId', 'name')
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const syncResults = {
      googleSheets: null,
      sharePoint: null,
      errors: []
    }

    // Sync to Google Sheets
    if (doc.syncWithGoogleSheets && doc.googleSheetsUrl) {
      try {
        if (!user.googleOAuth?.accessToken) {
          throw new Error('Google account not connected')
        }
        // Ensure client is populated
        if (!doc.clientId?.name && doc.clientId) {
          await doc.populate('clientId', 'name')
        }
        const result = await googleSheetsService.appendDocumentRow(user, User, doc, doc.googleSheetsUrl)
        syncResults.googleSheets = result
        doc.syncStatus = 'synced'
        doc.lastSyncedAt = new Date()
      } catch (error) {
        console.error('Google Sheets sync error:', error)
        syncResults.errors.push({ service: 'Google Sheets', error: error.message })
        doc.syncStatus = 'error'
      }
    }

    // Sync to SharePoint
    if (doc.syncWithSharePoint && doc.sharePointUrl) {
      try {
        if (!user.microsoftOAuth?.accessToken) {
          throw new Error('Microsoft account not connected')
        }
        
        // For SharePoint, we'll sync metadata only (can be extended to upload files)
        const metadataResult = await sharePointService.syncDocumentMetadata(user, User, doc, doc.sharePointUrl)
        
        // If document has files, upload them too
        if (doc.files && doc.files.length > 0 && doc.files[0].url) {
          const filePath = doc.files[0].url.replace(/^\//, '') // Remove leading slash
          try {
            await sharePointService.uploadDocumentToSharePoint(user, User, doc, doc.sharePointUrl, filePath)
          } catch (uploadError) {
            console.error('SharePoint file upload error:', uploadError)
            // Metadata sync succeeded, so partial success
            syncResults.sharePoint = {
              ...metadataResult,
              fileUploadWarning: uploadError.message
            }
          }
        } else {
          syncResults.sharePoint = metadataResult
        }
        
        if (doc.syncStatus !== 'error') {
          doc.syncStatus = 'synced'
          doc.lastSyncedAt = new Date()
        }
      } catch (error) {
        console.error('SharePoint sync error:', error)
        syncResults.errors.push({ service: 'SharePoint', error: error.message })
        if (doc.syncStatus !== 'synced') {
          doc.syncStatus = 'error'
        }
      }
    }

    await doc.save()

    if (syncResults.errors.length > 0) {
      return res.status(207).json({ // 207 Multi-Status
        message: 'Sync completed with errors',
        syncStatus: doc.syncStatus,
        lastSyncedAt: doc.lastSyncedAt,
        results: syncResults
      })
    }

    res.json({
      message: 'Sync completed successfully',
      syncStatus: doc.syncStatus,
      lastSyncedAt: doc.lastSyncedAt,
      results: syncResults
    })
  } catch (err) {
    console.error('Sync error:', err)
    res.status(400).json({ error: err.message })
  }
})

module.exports = router; 