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

// In-memory token storage for demo (replace with DB in production)
let googleTokens = null;
let microsoftTokens = null;

const app = express();
app.use(cors({
  origin: [
    'https://new-client-kohl.vercel.app', // your deployed frontend
    'http://localhost:3000' // for local dev
  ],
  credentials: true // if you use cookies or auth headers
}));
app.use(express.json());

// Import routes
const userRoutes = require('./routes/user');
const clientRoutes = require('./routes/client');
const firmRoutes = require('./routes/firm');
const managerRoutes = require('./routes/manager');
const taskRoutes = require('./routes/task');
const queryRoutes = require('./routes/query');
const documentRoutes = require('./routes/document');
const calendarEventRoutes = require('./routes/calendarEvent');
const dashboardRoutes = require('./routes/dashboard');

// Use routes
app.use('/api/auth', userRoutes); // Auth routes (login, etc.)
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/firms', firmRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Google OAuth endpoints
app.get('/api/auth/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });
    googleTokens = response.data;
    res.send('Google Drive/Sheets connected! You can close this window.');
  } catch (err) {
    res.status(500).send('Google OAuth failed: ' + err.message);
  }
});

// Microsoft OAuth endpoints
app.get('/api/auth/sharepoint', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.MS_REDIRECT_URI,
    response_mode: 'query',
    scope: 'https://graph.microsoft.com/Files.Read.All offline_access',
    prompt: 'consent',
  });
  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`);
});

app.get('/api/auth/sharepoint/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      code,
      redirect_uri: process.env.MS_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Files.Read.All offline_access',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    microsoftTokens = response.data;
    res.send('SharePoint connected! You can close this window.');
  } catch (err) {
    res.status(500).send('Microsoft OAuth failed: ' + err.message);
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