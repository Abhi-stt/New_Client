const express = require('express');
const multer = require('multer');
const Document = require('../schemas/Document');
const router = express.Router();

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

// Get all documents with role-based filtering
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.query;
    let query = {};

    // Role-based filtering
    if (role === 'client') {
      // Clients can only see their own documents
      query = { clientId: userId };
    } else if (role === 'team_member') {
      // Team members can see documents of clients assigned to them
      // This would need to be implemented based on your data structure
      query = {};
    } else if (role === 'manager') {
      // Managers can see documents of clients assigned to them
      // This would need to be implemented based on your data structure
      query = {};
    }
    // Admin can see all documents (no filter)

    const documents = await Document.find(query)
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

// Update document
router.put('/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json({
      ...document.toObject(),
      id: document._id,
    });
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

    const document = new Document({
      name,
      description,
      type,
      clientId,
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
    const { clientId, documentName, description, dueDate, priority, sendEmail, sendWhatsApp } = req.body;
    
    // Create a document request (you might want to create a separate DocumentRequest model)
    const documentRequest = {
      clientId,
      documentName,
      description,
      dueDate,
      priority,
      sendEmail,
      sendWhatsApp,
      status: 'pending',
      createdAt: new Date()
    };
    
    // For now, we'll just return success
    // In a real implementation, you'd save this to a database and send notifications
    res.status(201).json({ 
      message: 'Document request sent successfully',
      request: documentRequest 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Download document route
router.get('/:id/download', async (req, res) => {
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

module.exports = router; 