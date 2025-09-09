const express = require('express');
const Service = require('../schemas/Service');
const Task = require('../schemas/Task');
const User = require('../schemas/User');
const UserActivity = require('../schemas/UserActivity');
const router = express.Router();

// Create a new service
router.post('/', async (req, res) => {
  try {
    const { createdBy, clientId, ...serviceData } = req.body;
    
    // Validate required fields
    if (!createdBy || !clientId) {
      return res.status(400).json({ error: 'createdBy and clientId are required' });
    }

    const service = new Service({
      ...serviceData,
      createdBy,
      clientId
    });
    
    await service.save();
    
    // Log activity
    await new UserActivity({
      userId: createdBy,
      action: 'create_service',
      description: `Created service: ${service.name}`,
      metadata: { 
        serviceId: service._id, 
        clientId: clientId,
        category: service.category
      }
    }).save();

    // Populate the response
    const populatedService = await Service.findById(service._id)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('firmId', 'name');

    res.status(201).json({
      ...populatedService.toObject(),
      id: populatedService._id
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all services
router.get('/', async (req, res) => {
  try {
    const { role, userId, clientId } = req.query;
    let query = {};

    // Role-based filtering
    if (role === 'client') {
      query.clientId = userId; // Client can see their own services
    } else if (role === 'team_member') {
      // Team members can see services assigned to them
      query.assignedTo = userId;
    } else if (role === 'manager') {
      // Managers can see services for their team and clients
      const User = require('../schemas/User');
      const teamMembers = await User.find({ managerId: userId }, '_id');
      const teamMemberIds = teamMembers.map(u => u._id);
      query = {
        $or: [
          { assignedTo: { $in: [userId, ...teamMemberIds] } },
          { createdBy: userId }
        ]
      };
    }
    // Admin and super_admin can see all services (no filter)

    // Filter by client if specified
    if (clientId) {
      query.clientId = clientId;
    }

    const services = await Service.find(query)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('firmId', 'name')
      .sort({ createdAt: -1 });

    res.json(services.map(service => ({
      ...service.toObject(),
      id: service._id
    })));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('clientId', 'name email phone address')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('firmId', 'name type');
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    // Get related tasks
    const tasks = await Task.find({ serviceId: service._id })
      .populate('assigneeId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      ...service.toObject(),
      id: service._id,
      tasks: tasks.map(task => ({
        ...task.toObject(),
        id: task._id
      }))
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update service
router.put('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    )
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('firmId', 'name');
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    // Log activity
    await new UserActivity({
      userId: userId || service.createdBy,
      action: 'update_service',
      description: `Updated service: ${service.name}`,
      metadata: { 
        serviceId: service._id,
        changes: req.body
      }
    }).save();
    
    res.json({
      ...service.toObject(),
      id: service._id
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const service = await Service.findById(req.params.id);
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    // Check if service has tasks
    const taskCount = await Task.countDocuments({ serviceId: service._id });
    if (taskCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete service with ${taskCount} associated tasks. Please delete or reassign tasks first.` 
      });
    }
    
    await Service.findByIdAndDelete(req.params.id);
    
    // Log activity
    await new UserActivity({
      userId: userId || service.createdBy,
      action: 'delete_service',
      description: `Deleted service: ${service.name}`,
      metadata: { 
        serviceId: service._id,
        clientId: service.clientId
      }
    }).save();
    
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create tasks from service
router.post('/:id/create-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { createdBy } = req.body;
    
    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    if (!service.autoCreateTasks || !service.taskTemplates || service.taskTemplates.length === 0) {
      return res.status(400).json({ error: 'Service does not have auto-create tasks enabled or no task templates' });
    }
    
    const createdTasks = [];
    
    // Create tasks from templates
    for (const template of service.taskTemplates) {
      const task = new Task({
        title: template.title,
        description: template.description,
        clientId: service.clientId,
        serviceId: service._id,
        assigneeId: service.assignedTo || createdBy,
        createdBy: createdBy,
        priority: template.priority,
        dueDate: service.dueDate,
        estimatedHours: template.estimatedHours,
        tags: [service.category]
      });
      
      await task.save();
      createdTasks.push(task);
      
      // Log activity
      await new UserActivity({
        userId: createdBy,
        action: 'create_task_from_service',
        description: `Created task from service: ${service.name} - ${template.title}`,
        metadata: { 
          taskId: task._id,
          serviceId: service._id,
          template: template.title
        }
      }).save();
    }
    
    // Update service status
    service.status = 'in_progress';
    await service.save();
    
    res.status(201).json({
      message: `Created ${createdTasks.length} tasks from service`,
      tasks: createdTasks,
      service: service
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get service templates (predefined service types)
router.get('/templates/categories', async (req, res) => {
  try {
    const categories = [
      {
        category: 'compliance',
        name: 'Compliance Services',
        templates: [
          {
            name: 'Annual Compliance',
            description: 'Annual compliance filing and documentation',
            taskTemplates: [
              { title: 'Prepare Annual Return', description: 'Prepare and file annual return', priority: 'high', estimatedHours: 4 },
              { title: 'Update Company Records', description: 'Update company records and registers', priority: 'medium', estimatedHours: 2 },
              { title: 'File Compliance Documents', description: 'File all required compliance documents', priority: 'high', estimatedHours: 3 }
            ]
          },
          {
            name: 'ROC Filing',
            description: 'Registrar of Companies filing services',
            taskTemplates: [
              { title: 'Prepare ROC Forms', description: 'Prepare required ROC forms', priority: 'high', estimatedHours: 3 },
              { title: 'Review Documents', description: 'Review all supporting documents', priority: 'medium', estimatedHours: 2 },
              { title: 'Submit to ROC', description: 'Submit forms to ROC portal', priority: 'high', estimatedHours: 1 }
            ]
          }
        ]
      },
      {
        category: 'accounting',
        name: 'Accounting Services',
        templates: [
          {
            name: 'Monthly Bookkeeping',
            description: 'Monthly accounting and bookkeeping services',
            taskTemplates: [
              { title: 'Record Transactions', description: 'Record all monthly transactions', priority: 'medium', estimatedHours: 6 },
              { title: 'Reconcile Accounts', description: 'Reconcile bank and other accounts', priority: 'medium', estimatedHours: 4 },
              { title: 'Prepare Reports', description: 'Prepare monthly financial reports', priority: 'high', estimatedHours: 3 }
            ]
          }
        ]
      },
      {
        category: 'tax',
        name: 'Tax Services',
        templates: [
          {
            name: 'Income Tax Return',
            description: 'Individual or corporate income tax return filing',
            taskTemplates: [
              { title: 'Gather Tax Documents', description: 'Collect all required tax documents', priority: 'high', estimatedHours: 2 },
              { title: 'Calculate Tax Liability', description: 'Calculate tax liability and deductions', priority: 'high', estimatedHours: 4 },
              { title: 'File Tax Return', description: 'File tax return with authorities', priority: 'high', estimatedHours: 2 }
            ]
          }
        ]
      }
    ];
    
    res.json(categories);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
