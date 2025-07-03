const mongoose = require('mongoose');
const User = require('./schemas/User');
const Client = require('./schemas/Client');
const Firm = require('./schemas/Firm');
const Task = require('./schemas/Task');
const Query = require('./schemas/Query');
const Document = require('./schemas/Document');
const CalendarEvent = require('./schemas/CalendarEvent');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/client-portal', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

const createSampleData = async () => {
  try {
    console.log('Creating sample data...');

    // Get existing users
    const adminUser = await User.findOne({ email: 'admin@demo.com' });
    const managerUser = await User.findOne({ email: 'manager@demo.com' });
    const teamUser = await User.findOne({ email: 'team@demo.com' });
    const clientUser = await User.findOne({ email: 'client@demo.com' });

    if (!adminUser || !managerUser || !teamUser || !clientUser) {
      console.log('Please create demo users first using the /api/users/create-demo-users endpoint');
      return;
    }

    // Create sample clients
    const sampleClients = [
      {
        name: 'ABC Corporation',
        email: 'contact@abccorp.com',
        phone: '+91-9876543210',
        address: '123 Business Park, Mumbai, Maharashtra',
        type: 'company',
        registrationNumber: 'CORP123456',
        panNumber: 'ABCDE1234F',
        gstNumber: '27ABCDE1234F1Z5',
        managerId: managerUser._id,
        assignedTeamMembers: [teamUser._id],
        status: 'active'
      },
      {
        name: 'XYZ Industries',
        email: 'info@xyzindustries.com',
        phone: '+91-9876543211',
        address: '456 Industrial Area, Delhi, Delhi',
        type: 'company',
        registrationNumber: 'CORP789012',
        panNumber: 'XYZAB5678G',
        gstNumber: '07XYZAB5678G2H6',
        managerId: managerUser._id,
        assignedTeamMembers: [teamUser._id],
        status: 'active'
      },
      {
        name: 'DEF Solutions',
        email: 'hello@defsolutions.com',
        phone: '+91-9876543212',
        address: '789 Tech Hub, Bangalore, Karnataka',
        type: 'company',
        registrationNumber: 'CORP345678',
        panNumber: 'DEFGH9012H',
        gstNumber: '29DEFGH9012H3I7',
        managerId: managerUser._id,
        assignedTeamMembers: [teamUser._id],
        status: 'active'
      }
    ];

    // Clear existing clients and create new ones
    await Client.deleteMany({});
    const clients = await Client.insertMany(sampleClients);
    console.log(`Created ${clients.length} clients`);

    // Create sample firms
    const sampleFirms = [
      {
        name: 'ABC Corp Pvt Ltd',
        type: 'pvt_ltd',
        registrationNumber: 'U12345MH2020PTC123456',
        address: '123 Business Park, Mumbai, Maharashtra',
        panNumber: 'ABCDE1234F',
        gstNumber: '27ABCDE1234F1Z5',
        cinNumber: 'U12345MH2020PTC123456',
        incorporationDate: '2020-01-15',
        clientId: clientUser._id,
        status: 'active'
      },
      {
        name: 'XYZ Industries Ltd',
        type: 'public_ltd',
        registrationNumber: 'L12345DL2019PLC123456',
        address: '456 Industrial Area, Delhi, Delhi',
        panNumber: 'XYZAB5678G',
        gstNumber: '07XYZAB5678G2H6',
        cinNumber: 'L12345DL2019PLC123456',
        incorporationDate: '2019-06-20',
        clientId: clientUser._id,
        status: 'active'
      }
    ];

    // Clear existing firms and create new ones
    await Firm.deleteMany({});
    const firms = await Firm.insertMany(sampleFirms);
    console.log(`Created ${firms.length} firms`);

    // Create sample tasks
    const sampleTasks = [
      {
        title: 'GST Return Filing - Q4 2024',
        description: 'File quarterly GST return for ABC Corporation',
        clientId: clients[0]._id,
        assigneeId: teamUser._id,
        createdBy: managerUser._id,
        priority: 'high',
        status: 'pending',
        dueDate: new Date('2024-01-25'),
        type: 'compliance'
      },
      {
        title: 'Bank Reconciliation - December 2024',
        description: 'Reconcile bank statements for XYZ Industries',
        clientId: clients[1]._id,
        assigneeId: teamUser._id,
        createdBy: managerUser._id,
        priority: 'medium',
        status: 'in_progress',
        dueDate: new Date('2024-01-30'),
        type: 'accounting'
      },
      {
        title: 'TDS Payment - Q3 2024',
        description: 'Process TDS payment for DEF Solutions',
        clientId: clients[2]._id,
        assigneeId: teamUser._id,
        createdBy: managerUser._id,
        priority: 'high',
        status: 'completed',
        dueDate: new Date('2024-01-15'),
        type: 'compliance'
      }
    ];

    // Clear existing tasks and create new ones
    await Task.deleteMany({});
    const tasks = await Task.insertMany(sampleTasks);
    console.log(`Created ${tasks.length} tasks`);

    // Create sample queries
    const sampleQueries = [
      {
        title: 'GST Input Credit Query',
        description: 'Need clarification on claiming input credit for office supplies',
        category: 'gst',
        priority: 'medium',
        status: 'pending',
        createdBy: clientUser._id,
        createdByName: clientUser.name,
        assignedTo: teamUser._id
      },
      {
        title: 'TDS Rate Confusion',
        description: 'What is the correct TDS rate for professional services?',
        category: 'tax',
        priority: 'high',
        status: 'in_progress',
        createdBy: clientUser._id,
        createdByName: clientUser.name,
        assignedTo: teamUser._id
      },
      {
        title: 'Compliance Deadline Extension',
        description: 'Request for extension of ITR filing deadline',
        category: 'compliance',
        priority: 'high',
        status: 'resolved',
        createdBy: clientUser._id,
        createdByName: clientUser.name,
        assignedTo: teamUser._id
      }
    ];

    // Clear existing queries and create new ones
    await Query.deleteMany({});
    const queries = await Query.insertMany(sampleQueries);
    console.log(`Created ${queries.length} queries`);

    // Create sample documents
    const sampleDocuments = [
      {
        name: 'GST Return Q3 2024',
        description: 'Quarterly GST return for ABC Corporation',
        type: 'GST Return',
        clientId: clients[0]._id,
        firmId: firms[0]._id,
        status: 'approved',
        files: [
          {
            filename: 'gst-return-q3.pdf',
            url: '/uploads/gst-return-q3.pdf',
            size: 1024000,
            mimetype: 'application/pdf',
            uploadedAt: new Date()
          }
        ]
      },
      {
        name: 'Bank Statement December 2024',
        description: 'Bank statement for reconciliation',
        type: 'Bank Statement',
        clientId: clients[1]._id,
        firmId: firms[1]._id,
        status: 'pending',
        files: [
          {
            filename: 'bank-statement-dec.pdf',
            url: '/uploads/bank-statement-dec.pdf',
            size: 2048000,
            mimetype: 'application/pdf',
            uploadedAt: new Date()
          }
        ]
      },
      {
        name: 'TDS Certificate Q3 2024',
        description: 'TDS certificate for professional services',
        type: 'TDS Certificate',
        clientId: clients[2]._id,
        firmId: firms[0]._id,
        status: 'synced',
        files: [
          {
            filename: 'tds-certificate-q3.pdf',
            url: '/uploads/tds-certificate-q3.pdf',
            size: 512000,
            mimetype: 'application/pdf',
            uploadedAt: new Date()
          }
        ]
      }
    ];

    // Clear existing documents and create new ones
    await Document.deleteMany({});
    const documents = await Document.insertMany(sampleDocuments);
    console.log(`Created ${documents.length} documents`);

    // Create sample calendar events
    const sampleEvents = [
      {
        title: 'GST Return Deadline',
        description: 'Monthly GST return filing deadline',
        date: new Date('2024-01-20'),
        priority: 'high',
        clientId: clients[0]._id,
        assigneeId: teamUser._id,
        type: 'deadline'
      },
      {
        title: 'Client Meeting - ABC Corp',
        description: 'Quarterly review meeting with ABC Corporation',
        date: new Date('2024-01-22'),
        priority: 'medium',
        clientId: clients[0]._id,
        assigneeId: managerUser._id,
        type: 'meeting'
      },
      {
        title: 'TDS Payment Due',
        description: 'Quarterly TDS payment deadline',
        date: new Date('2024-01-25'),
        priority: 'high',
        clientId: clients[1]._id,
        assigneeId: teamUser._id,
        type: 'deadline'
      }
    ];

    // Clear existing calendar events and create new ones
    await CalendarEvent.deleteMany({});
    const events = await CalendarEvent.insertMany(sampleEvents);
    console.log(`Created ${events.length} calendar events`);

    console.log('✅ Sample data created successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${clients.length} clients`);
    console.log(`   - ${firms.length} firms`);
    console.log(`   - ${tasks.length} tasks`);
    console.log(`   - ${queries.length} queries`);
    console.log(`   - ${documents.length} documents`);
    console.log(`   - ${events.length} calendar events`);

  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
  }
};

createSampleData(); 