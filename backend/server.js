const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodeCron = require('node-cron');
const Document = require('./schemas/Document');
const nodemailer = require('nodemailer');
const axios = require('axios');

const User = require('./schemas/User');
const googleSheetsService = require('./services/googleSheetsService');
const sharePointService = require('./services/sharePointService');

const app = express();

const allowedOrigins = [
  'https://new-client-kohl.vercel.app',
  'http://localhost:3000',
  'https://localhost:3000',
  'https://ca-client-portal.onrender.com',
  // Add your deployment domains here
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_HOST_URL,
  // Add common Vercel patterns
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.dev$/,
  // Add Render.com patterns
  /^https:\/\/.*\.onrender\.com$/
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost in development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Check if origin is in allowed list (exact match)
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Check if origin matches Vercel patterns
    if (allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    })) {
      return callback(null, true);
    }
    
    // For production, you might want to be more restrictive
    if (process.env.NODE_ENV === 'production') {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    } else {
      // In development, allow all origins
      return callback(null, true);
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // <-- This line is key!

app.use(express.json());

// Root route - Health check and API info
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Client Portal API is running',
    version: '1.0.0',
    backendUrl: 'https://ca-client-portal.onrender.com',
    endpoints: {
      auth: '/api/users/login',
      docs: '/api/documents',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Import routes
const userRoutes = require('./routes/user');
const clientRoutes = require('./routes/client');
const firmRoutes = require('./routes/firm');
const managerRoutes = require('./routes/manager');
const taskRoutes = require('./routes/task');
const serviceRoutes = require('./routes/service');
const queryRoutes = require('./routes/query');
const documentRoutes = require('./routes/document');
const calendarEventRoutes = require('./routes/calendarEvent');
const dashboardRoutes = require('./routes/dashboard');
const superAdminRoutes = require('./routes/superAdmin');
const complianceRoutes = require('./routes/compliance');
const emailRoutes = require('./routes/email');

// Use routes
app.use('/api/auth', userRoutes); // Auth routes (login, etc.)
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/firms', firmRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/email', emailRoutes);

// Google OAuth endpoints - User-specific
app.get('/api/auth/google', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authUrl = googleSheetsService.getAuthUrl(userId);
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Google OAuth URL: ' + err.message });
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state; // Contains userId
    const error = req.query.error;

    if (error) {
      return res.send(`
        <html>
          <body>
            <h2>Authorization Cancelled</h2>
            <p>You cancelled the Google authorization. You can close this window.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(`
        <html>
          <body>
            <h2>Authorization Failed</h2>
            <p>Missing authorization code or user ID. You can close this window.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);
    }

    const userId = state;
    const result = await googleSheetsService.exchangeCodeForTokens(code, userId, User);

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">✓ Google Account Connected Successfully!</h2>
          <p>Connected as: <strong>${result.email}</strong></p>
          <p>You can close this window and return to the application.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: red;">Authorization Failed</h2>
          <p>${err.message}</p>
          <p>You can close this window and try again.</p>
          <script>setTimeout(() => window.close(), 5000);</script>
        </body>
      </html>
    `);
  }
});

// Microsoft OAuth endpoints - User-specific
app.get('/api/auth/sharepoint', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authUrl = sharePointService.getAuthUrl(userId);
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Microsoft OAuth URL: ' + err.message });
  }
});

app.get('/api/auth/sharepoint/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state; // Contains userId
    const error = req.query.error;

    if (error) {
      return res.send(`
        <html>
          <body>
            <h2>Authorization Cancelled</h2>
            <p>You cancelled the Microsoft authorization. You can close this window.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(`
        <html>
          <body>
            <h2>Authorization Failed</h2>
            <p>Missing authorization code or user ID. You can close this window.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);
    }

    const userId = state;
    const result = await sharePointService.exchangeCodeForTokens(code, userId, User);

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">✓ Microsoft Account Connected Successfully!</h2>
          <p>Connected as: <strong>${result.email}</strong></p>
          <p>You can close this window and return to the application.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: red;">Authorization Failed</h2>
          <p>${err.message}</p>
          <p>You can close this window and try again.</p>
          <script>setTimeout(() => window.close(), 5000);</script>
        </body>
      </html>
    `);
  }
});

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure Nodemailer (reuse config from routes/document.js or set your SMTP config)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Scheduled job: runs every day at 8am
nodeCron.schedule('0 8 * * *', async () => {
  try {
    const now = new Date();
    // 1. 24-hour reminders
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const docsForReminder = await Document.find({
      status: 'pending',
      uploadLinkUsed: false,
      dueDate: { $gte: now, $lte: soon },
      reminderCount: 0
    });
    for (const doc of docsForReminder) {
      if (doc.clientEmail) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: doc.clientEmail,
          subject: `Reminder: Document Due Soon (${doc.name})`,
          html: `<p>This is a reminder that your document <b>${doc.name}</b> is due on ${new Date(doc.dueDate).toLocaleString()}.</p>\n                 <p>Please upload using your secure link (if not already used).</p>`
        });
        doc.reminderCount = 1;
        await doc.save();
        console.log(`24-hour reminder sent to ${doc.clientEmail} for document ${doc.name}`);
      }
    }
    // 2. Daily follow-ups after due date
    const overdueDocs = await Document.find({
      status: 'pending',
      uploadLinkUsed: false,
      dueDate: { $lt: now }
    });
    for (const doc of overdueDocs) {
      const limit = doc.reminderLimit ?? 3;
      if (doc.clientEmail && doc.reminderCount < limit) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: doc.clientEmail,
          subject: `Follow-up: Document Overdue (${doc.name})`,
          html: `<p>Your document <b>${doc.name}</b> was due on ${new Date(doc.dueDate).toLocaleString()} and has not been uploaded yet.</p>\n                 <p>Please upload as soon as possible using your secure link (if not already used).</p>`
        });
        doc.reminderCount += 1;
        await doc.save();
        console.log(`Overdue follow-up sent to ${doc.clientEmail} for document ${doc.name}`);
      }
    }
    console.log('Document reminders and follow-ups sent.');
  } catch (err) {
    console.error('Error in scheduled document reminders:', err);
  }
});

// Manual endpoint to trigger document reminders for testing
app.post('/api/test-document-reminders', async (req, res) => {
  try {
    const now = new Date();
    // 1. 24-hour reminders
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const docsForReminder = await Document.find({
      status: 'pending',
      uploadLinkUsed: false,
      dueDate: { $gte: now, $lte: soon },
      reminderCount: 0
    });
    for (const doc of docsForReminder) {
      if (doc.clientEmail) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: doc.clientEmail,
          subject: `Reminder: Document Due Soon (${doc.name})`,
          html: `<p>This is a reminder that your document <b>${doc.name}</b> is due on ${new Date(doc.dueDate).toLocaleString()}.</p>\n                 <p>Please upload using your secure link (if not already used).</p>`
        });
        doc.reminderCount = 1;
        await doc.save();
        console.log(`[TEST] 24-hour reminder sent to ${doc.clientEmail} for document ${doc.name}`);
      }
    }
    // 2. Daily follow-ups after due date
    const overdueDocs = await Document.find({
      status: 'pending',
      uploadLinkUsed: false,
      dueDate: { $lt: now }
    });
    for (const doc of overdueDocs) {
      const limit = doc.reminderLimit ?? 3;
      if (doc.clientEmail && doc.reminderCount < limit) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: doc.clientEmail,
          subject: `Follow-up: Document Overdue (${doc.name})`,
          html: `<p>Your document <b>${doc.name}</b> was due on ${new Date(doc.dueDate).toLocaleString()} and has not been uploaded yet.</p>\n                 <p>Please upload as soon as possible using your secure link (if not already used).</p>`
        });
        doc.reminderCount += 1;
        await doc.save();
        console.log(`[TEST] Overdue follow-up sent to ${doc.clientEmail} for document ${doc.name}`);
      }
    }
    console.log('Manual trigger: Document reminders and follow-ups sent.');
    res.json({ message: 'Document reminders and follow-ups sent.' });
  } catch (err) {
    console.error('Error in manual document reminders:', err);
    res.status(500).json({ error: err.message });
  }
});

// MongoDB connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client-portal';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  }); 