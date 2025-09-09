const express = require('express');
const Client = require('../schemas/Client');
const Task = require('../schemas/Task');
const Service = require('../schemas/Service');
const Document = require('../schemas/Document');
const Compliance = require('../schemas/Compliance');
const XLSX = require('xlsx');
const { getUserAdminId, buildAccessFilter, setOwnershipFields } = require('../utils/accessControl');
const router = express.Router();

// Create a new client
router.post('/', async (req, res) => {
  try {
    // Get current user for ownership (from query params or middleware)
    const { role, userId } = req.query;
    const currentUser = req.user || { 
      role: role || 'guest', 
      id: userId || null 
    };
    
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    
    // Set ownership fields
    const ownershipFields = setOwnershipFields(currentUser.role, currentUser.id, userAdminId);
    
    const client = new Client({
      ...req.body,
      ...ownershipFields
    });
    
    await client.save();
    res.status(201).json({
      ...client.toObject(),
      id: client._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all clients with role-based filtering
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.query;
    
    // Get current user for access control
    const currentUser = req.user || { role: role || 'guest', id: userId || null };
    if (!currentUser.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userAdminId = await getUserAdminId(currentUser.id);
    let clients = [];

    console.log(`Fetching clients for role: ${role}, userId: ${userId}, adminId: ${userAdminId}`);

    // Role-based filtering with admin domain isolation
    if (role === 'client') {
      // Clients can only see their own data within their admin domain
      clients = await Client.find({ 
        _id: userId,
        adminId: userAdminId 
      });
    } else if (role === 'team_member') {
      // Team members can see clients from tasks assigned to them within their admin domain
      const clientIds = await Task.find({ 
        assigneeId: userId,
        adminId: userAdminId,
        clientId: { $exists: true, $ne: null }
      }).distinct('clientId');
      
      clients = await Client.find({ 
        _id: { $in: clientIds },
        adminId: userAdminId 
      });
    } else if (role === 'manager') {
      // Managers can only see clients directly assigned to them within their admin domain
      clients = await Client.find({ 
        managerId: userId,
        adminId: userAdminId 
      });
      console.log(`Found ${clients.length} clients assigned to manager ${userId} in domain ${userAdminId}`);
    } else if (role === 'super_admin') {
      // Super admin can see all clients across all domains
      clients = await Client.find({});
    } else {
      // Admin can see all clients in their domain only
      const accessFilter = buildAccessFilter(currentUser.role, currentUser.id, userAdminId);
      clients = await Client.find(accessFilter);
    }

    console.log(`Returning ${clients.length} clients for ${role} ${userId}`);

    res.json(clients.map(client => ({
      ...client.toObject(),
      id: client._id,
      firmsCount: 0, // This would need to be calculated
      complianceRate: 85, // This would need to be calculated
    })));
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({
      ...client.toObject(),
      id: client._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({
      ...client.toObject(),
      id: client._id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get client compliance data
router.get('/:id/compliance', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Get real compliance data from database
    const complianceItems = await Compliance.find({ 
      clientId: req.params.id, 
      isActive: true 
    }).populate('assignedTo', 'name email').sort({ dueDate: 1 });
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    // Categorize compliance items
    const recurring = [];
    const upcoming = [];
    const overdue = [];
    
    complianceItems.forEach(item => {
      const complianceItem = {
        id: item._id,
        name: item.name,
        description: item.description,
        category: item.category,
        priority: item.priority,
        status: item.status,
        assignedTo: item.assignedTo ? item.assignedTo.name : 'Unassigned',
        dueDate: item.dueDate,
        daysUntilDue: item.daysUntilDue,
        daysOverdue: item.daysOverdue,
        regulatoryBody: item.regulatoryBody,
        formNumber: item.formNumber,
        penaltyAmount: item.penaltyAmount,
        lateFeeAmount: item.lateFeeAmount
      };
      
      if (item.isRecurring) {
        // Add recurring compliance items
        recurring.push({
          ...complianceItem,
          frequency: item.frequency,
          nextDue: item.nextDueDate ? new Date(item.nextDueDate).toISOString().split('T')[0] : null,
          recurrenceInterval: item.recurrenceInterval
        });
      }
      
      // Check if overdue
      if (item.isOverdue()) {
        overdue.push(complianceItem);
      } else if (item.dueDate && new Date(item.dueDate) <= thirtyDaysFromNow) {
        // Upcoming (within 30 days)
        upcoming.push(complianceItem);
      }
    });
    
    // Also check for compliance-related tasks and services
    const [complianceTasks, complianceServices] = await Promise.all([
      Task.find({ 
        clientId: req.params.id, 
        tags: { $in: ['compliance', 'tax', 'gst', 'tds', 'audit'] },
        status: { $in: ['pending', 'in_progress'] }
      }).populate('assigneeId', 'name email'),
      Service.find({ 
        clientId: req.params.id, 
        category: { $in: ['compliance', 'tax', 'audit'] },
        status: { $in: ['pending', 'in_progress'] }
      }).populate('assignedTo', 'name email')
    ]);
    
    // Add compliance tasks to upcoming if they have due dates
    complianceTasks.forEach(task => {
      if (task.dueDate && new Date(task.dueDate) <= thirtyDaysFromNow) {
        upcoming.push({
          id: task._id,
          name: task.title,
          description: task.description,
          category: 'task',
          priority: task.priority,
          status: task.status,
          assignedTo: task.assigneeId ? task.assigneeId.name : 'Unassigned',
          dueDate: task.dueDate,
          daysUntilDue: Math.ceil((new Date(task.dueDate) - today) / (1000 * 60 * 60 * 24)),
          daysOverdue: 0,
          type: 'task'
        });
      }
    });
    
    // Add compliance services to upcoming if they have due dates
    complianceServices.forEach(service => {
      if (service.dueDate && new Date(service.dueDate) <= thirtyDaysFromNow) {
        upcoming.push({
          id: service._id,
          name: service.name,
          description: service.description,
          category: service.category,
          priority: service.priority,
          status: service.status,
          assignedTo: service.assignedTo ? service.assignedTo.name : 'Unassigned',
          dueDate: service.dueDate,
          daysUntilDue: Math.ceil((new Date(service.dueDate) - today) / (1000 * 60 * 60 * 24)),
          daysOverdue: 0,
          type: 'service'
        });
      }
    });
    
    // Sort upcoming by due date
    upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    const complianceData = {
      recurring,
      upcoming,
      overdue,
      summary: {
        total: complianceItems.length,
        recurring: recurring.length,
        upcoming: upcoming.length,
        overdue: overdue.length,
        completed: complianceItems.filter(item => item.status === 'completed').length
      }
    };
    
    res.json(complianceData);
  } catch (err) {
    console.error('Error fetching compliance data:', err);
    res.status(400).json({ error: err.message });
  }
});

// Generate client report (Excel)
router.get('/:id/report', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Fetch related data
    const [tasks, services, documents] = await Promise.all([
      Task.find({ clientId: req.params.id }),
      Service.find({ clientId: req.params.id }),
      Document.find({ clientId: req.params.id })
    ]);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Client Information Sheet
    const clientData = [
      ['Client Information'],
      ['Name', client.name],
      ['Email', client.email],
      ['Phone', client.phone || 'N/A'],
      ['Address', client.address || 'N/A'],
      ['Type', client.type],
      ['Status', client.status],
      ['Registration Number', client.registrationNumber || 'N/A'],
      ['PAN Number', client.panNumber || 'N/A'],
      ['GST Number', client.gstNumber || 'N/A'],
      ['Created At', client.createdAt.toLocaleDateString()],
      ['Updated At', client.updatedAt.toLocaleDateString()]
    ];
    const clientSheet = XLSX.utils.aoa_to_sheet(clientData);
    XLSX.utils.book_append_sheet(workbook, clientSheet, 'Client Info');

    // Tasks Sheet
    if (tasks.length > 0) {
      const tasksData = [
        ['Title', 'Description', 'Status', 'Priority', 'Due Date', 'Assignee', 'Created At']
      ];
      tasks.forEach(task => {
        tasksData.push([
          task.title,
          task.description || '',
          task.status,
          task.priority || 'medium',
          task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
          task.assigneeId?.name || 'Unassigned',
          task.createdAt.toLocaleDateString()
        ]);
      });
      const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
    }

    // Services Sheet
    if (services.length > 0) {
      const servicesData = [
        ['Name', 'Description', 'Category', 'Status', 'Due Date', 'Assigned To', 'Created At']
      ];
      services.forEach(service => {
        servicesData.push([
          service.name,
          service.description || '',
          service.category || '',
          service.status,
          service.dueDate ? new Date(service.dueDate).toLocaleDateString() : 'N/A',
          service.assignedTo?.name || 'Unassigned',
          service.createdAt.toLocaleDateString()
        ]);
      });
      const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
      XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Services');
    }

    // Documents Sheet
    if (documents.length > 0) {
      const documentsData = [
        ['Name', 'Description', 'Type', 'Status', 'Due Date', 'Upload Status', 'Created At']
      ];
      documents.forEach(doc => {
        documentsData.push([
          doc.name,
          doc.description || '',
          doc.type || '',
          doc.status,
          doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'N/A',
          doc.uploadLinkUsed ? 'Uploaded' : 'Pending',
          doc.createdAt.toLocaleDateString()
        ]);
      });
      const documentsSheet = XLSX.utils.aoa_to_sheet(documentsData);
      XLSX.utils.book_append_sheet(workbook, documentsSheet, 'Documents');
    }

    // Summary Sheet
    const summaryData = [
      ['Client Report Summary'],
      ['Generated On', new Date().toLocaleString()],
      [''],
      ['Total Tasks', tasks.length],
      ['Completed Tasks', tasks.filter(t => t.status === 'completed').length],
      ['Pending Tasks', tasks.filter(t => t.status === 'pending').length],
      ['In Progress Tasks', tasks.filter(t => t.status === 'in_progress').length],
      [''],
      ['Total Services', services.length],
      ['Active Services', services.filter(s => s.status === 'in_progress').length],
      ['Completed Services', services.filter(s => s.status === 'completed').length],
      [''],
      ['Total Documents', documents.length],
      ['Uploaded Documents', documents.filter(d => d.uploadLinkUsed).length],
      ['Pending Documents', documents.filter(d => !d.uploadLinkUsed).length]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router; 