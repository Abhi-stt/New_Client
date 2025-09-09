const mongoose = require('mongoose');
const Compliance = require('../schemas/Compliance');
const Client = require('../schemas/Client');
const User = require('../schemas/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function populateComplianceData() {
  try {
    console.log('Starting to populate compliance data...');
    
    // Get a sample client and user
    const client = await Client.findOne();
    const user = await User.findOne();
    
    // If no client exists, create one
    if (!client) {
      console.log('No client found. Creating a sample client...');
      const newClient = new Client({
        name: 'ABC Corporation',
        email: 'abc@example.com',
        phone: '+91-9876543210',
        address: '123 Business Street, Mumbai, India',
        type: 'company',
        status: 'active',
        registrationNumber: 'REG123456',
        panNumber: 'ABCDE1234F',
        gstNumber: '27ABCDE1234F1Z5'
      });
      await newClient.save();
      console.log('Created client:', newClient.name);
    }
    
    const finalClient = client || await Client.findOne();
    
    if (!finalClient || !user) {
      console.log('No client or user found. Please create a client and user first.');
      return;
    }
    
    console.log(`Using client: ${finalClient.name} and user: ${user.name}`);
    
    // Clear existing compliance data for this client
    await Compliance.deleteMany({ clientId: finalClient._id });
    
    // Sample compliance items
    const complianceItems = [
      {
        name: 'GST Return - GSTR-1',
        description: 'Monthly GST return filing for outward supplies',
        clientId: finalClient._id,
        category: 'gst',
        type: 'recurring',
        frequency: 'monthly',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        priority: 'high',
        status: 'pending',
        assignedTo: user._id,
        createdBy: user._id,
        isRecurring: true,
        recurrenceInterval: 1,
        regulatoryBody: 'GST Department',
        formNumber: 'GSTR-1',
        penaltyAmount: 200,
        lateFeeAmount: 50,
        reminderDays: [7, 3, 1],
        tags: ['gst', 'monthly', 'tax']
      },
      {
        name: 'TDS Payment',
        description: 'Quarterly TDS payment to Income Tax Department',
        clientId: finalClient._id,
        category: 'tds',
        type: 'recurring',
        frequency: 'quarterly',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        priority: 'high',
        status: 'pending',
        assignedTo: user._id,
        createdBy: user._id,
        isRecurring: true,
        recurrenceInterval: 1,
        regulatoryBody: 'Income Tax Department',
        formNumber: 'TDS-1',
        penaltyAmount: 500,
        lateFeeAmount: 100,
        reminderDays: [10, 5, 2],
        tags: ['tds', 'quarterly', 'tax']
      },
      {
        name: 'Income Tax Return',
        description: 'Annual Income Tax Return filing',
        clientId: finalClient._id,
        category: 'tax',
        type: 'annual',
        frequency: 'annually',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        priority: 'critical',
        status: 'pending',
        assignedTo: user._id,
        createdBy: user._id,
        isRecurring: true,
        recurrenceInterval: 1,
        regulatoryBody: 'Income Tax Department',
        formNumber: 'ITR-1',
        penaltyAmount: 1000,
        lateFeeAmount: 200,
        reminderDays: [30, 15, 7, 3, 1],
        tags: ['itr', 'annual', 'tax']
      },
      {
        name: 'PF Payment',
        description: 'Employee Provident Fund contribution',
        clientId: finalClient._id,
        category: 'pf',
        type: 'recurring',
        frequency: 'monthly',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
        priority: 'high',
        status: 'overdue',
        assignedTo: user._id,
        createdBy: user._id,
        isRecurring: true,
        recurrenceInterval: 1,
        regulatoryBody: 'EPFO',
        formNumber: 'PF-1',
        penaltyAmount: 300,
        lateFeeAmount: 75,
        reminderDays: [7, 3, 1],
        tags: ['pf', 'monthly', 'employee']
      },
      {
        name: 'ESI Payment',
        description: 'Employee State Insurance contribution',
        clientId: finalClient._id,
        category: 'esi',
        type: 'recurring',
        frequency: 'monthly',
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        priority: 'medium',
        status: 'pending',
        assignedTo: user._id,
        createdBy: user._id,
        isRecurring: true,
        recurrenceInterval: 1,
        regulatoryBody: 'ESI Corporation',
        formNumber: 'ESI-1',
        penaltyAmount: 150,
        lateFeeAmount: 25,
        reminderDays: [7, 3, 1],
        tags: ['esi', 'monthly', 'employee']
      },
      {
        name: 'Audit Report',
        description: 'Statutory audit completion and filing',
        clientId: finalClient._id,
        category: 'audit',
        type: 'annual',
        frequency: 'annually',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        priority: 'medium',
        status: 'pending',
        assignedTo: user._id,
        createdBy: user._id,
        isRecurring: true,
        recurrenceInterval: 1,
        regulatoryBody: 'MCA',
        formNumber: 'AOC-4',
        penaltyAmount: 2000,
        lateFeeAmount: 500,
        reminderDays: [30, 15, 7, 3, 1],
        tags: ['audit', 'annual', 'statutory']
      }
    ];
    
    // Insert compliance items
    const createdItems = await Compliance.insertMany(complianceItems);
    console.log(`Created ${createdItems.length} compliance items`);
    
    // Log the created items
    createdItems.forEach(item => {
      console.log(`- ${item.name} (${item.category}) - Due: ${item.dueDate.toLocaleDateString()}`);
    });
    
    console.log('Compliance data populated successfully!');
    
  } catch (error) {
    console.error('Error populating compliance data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
populateComplianceData();
