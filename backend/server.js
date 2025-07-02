const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
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

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

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