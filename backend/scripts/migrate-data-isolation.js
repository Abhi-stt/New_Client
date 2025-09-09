const mongoose = require('mongoose');
const User = require('../schemas/User');
const Client = require('../schemas/Client');
const Task = require('../schemas/Task');
const Document = require('../schemas/Document');
const CalendarEvent = require('../schemas/CalendarEvent');
const Query = require('../schemas/Query');
const Firm = require('../schemas/Firm');

/**
 * Migration script to add data isolation fields to existing documents
 * This script will:
 * 1. Find the first admin user (or create one if none exists)
 * 2. Assign all existing data to this admin's domain
 * 3. Set appropriate createdBy and adminId fields
 */

async function migrateDataIsolation() {
  try {
    console.log('🚀 Starting data isolation migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-portal');
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Find or create first admin
    let firstAdmin = await User.findOne({ role: 'admin' });
    
    if (!firstAdmin) {
      console.log('❗ No admin user found. Creating default admin...');
      firstAdmin = new User({
        email: 'admin@example.com',
        password: '$2b$10$defaulthashedpassword', // You should hash this properly
        name: 'System Admin',
        role: 'admin',
        status: 'active',
        createdBy: null, // Will be set to self
        adminId: null    // Will be set to self
      });
      await firstAdmin.save();
      
      // Set self-referencing fields
      firstAdmin.createdBy = firstAdmin._id;
      firstAdmin.adminId = firstAdmin._id;
      await firstAdmin.save();
      
      console.log(`✅ Created default admin: ${firstAdmin.email} (ID: ${firstAdmin._id})`);
    } else {
      // Ensure first admin has proper self-referencing
      if (!firstAdmin.adminId) {
        firstAdmin.adminId = firstAdmin._id;
        await firstAdmin.save();
      }
      console.log(`✅ Found existing admin: ${firstAdmin.email} (ID: ${firstAdmin._id})`);
    }
    
    const adminId = firstAdmin._id;
    
    // Step 2: Migrate User documents
    console.log('📊 Migrating User documents...');
    const usersWithoutAdminId = await User.find({ adminId: { $exists: false } });
    console.log(`Found ${usersWithoutAdminId.length} users without adminId`);
    
    for (const user of usersWithoutAdminId) {
      const updates = {};
      
      // Set adminId (admins are their own admin, others belong to first admin)
      if (user.role === 'admin' || user.role === 'super_admin') {
        updates.adminId = user._id;
      } else {
        updates.adminId = adminId;
      }
      
      // Set createdBy if missing
      if (!user.createdBy) {
        updates.createdBy = user.role === 'admin' || user.role === 'super_admin' ? user._id : adminId;
      }
      
      await User.findByIdAndUpdate(user._id, updates);
    }
    
    const updatedUsers = await User.updateMany(
      { adminId: { $exists: false } },
      { $set: { adminId: adminId } }
    );
    console.log(`✅ Updated ${updatedUsers.modifiedCount} user documents`);
    
    // Step 3: Migrate Client documents
    console.log('📊 Migrating Client documents...');
    const clientsWithoutFields = await Client.find({
      $or: [
        { adminId: { $exists: false } },
        { createdBy: { $exists: false } }
      ]
    });
    console.log(`Found ${clientsWithoutFields.length} clients without required fields`);
    
    for (const client of clientsWithoutFields) {
      const updates = {};
      
      if (!client.adminId) {
        updates.adminId = adminId;
      }
      
      if (!client.createdBy) {
        updates.createdBy = adminId;
      }
      
      await Client.findByIdAndUpdate(client._id, updates);
    }
    console.log(`✅ Updated ${clientsWithoutFields.length} client documents`);
    
    // Step 4: Migrate Task documents
    console.log('📊 Migrating Task documents...');
    const tasksWithoutAdminId = await Task.find({ adminId: { $exists: false } });
    console.log(`Found ${tasksWithoutAdminId.length} tasks without adminId`);
    
    for (const task of tasksWithoutAdminId) {
      const updates = {};
      
      if (!task.adminId) {
        updates.adminId = adminId;
      }
      
      // CreatedBy should already exist in Task schema, but double-check
      if (!task.createdBy) {
        updates.createdBy = adminId;
      }
      
      await Task.findByIdAndUpdate(task._id, updates);
    }
    console.log(`✅ Updated ${tasksWithoutAdminId.length} task documents`);
    
    // Step 5: Migrate Document documents
    console.log('📊 Migrating Document documents...');
    const documentsWithoutFields = await Document.find({
      $or: [
        { adminId: { $exists: false } },
        { createdBy: { $exists: false } }
      ]
    });
    console.log(`Found ${documentsWithoutFields.length} documents without required fields`);
    
    for (const document of documentsWithoutFields) {
      const updates = {};
      
      if (!document.adminId) {
        updates.adminId = adminId;
      }
      
      if (!document.createdBy) {
        updates.createdBy = adminId;
      }
      
      await Document.findByIdAndUpdate(document._id, updates);
    }
    console.log(`✅ Updated ${documentsWithoutFields.length} document documents`);
    
    // Step 6: Migrate CalendarEvent documents
    console.log('📊 Migrating CalendarEvent documents...');
    const calendarEventsWithoutAdminId = await CalendarEvent.find({ adminId: { $exists: false } });
    console.log(`Found ${calendarEventsWithoutAdminId.length} calendar events without adminId`);
    
    for (const event of calendarEventsWithoutAdminId) {
      const updates = {};
      
      if (!event.adminId) {
        updates.adminId = adminId;
      }
      
      await CalendarEvent.findByIdAndUpdate(event._id, updates);
    }
    console.log(`✅ Updated ${calendarEventsWithoutAdminId.length} calendar event documents`);
    
    // Step 7: Migrate Query documents
    console.log('📊 Migrating Query documents...');
    const queriesWithoutAdminId = await Query.find({ adminId: { $exists: false } });
    console.log(`Found ${queriesWithoutAdminId.length} queries without adminId`);
    
    for (const query of queriesWithoutAdminId) {
      const updates = {};
      
      if (!query.adminId) {
        updates.adminId = adminId;
      }
      
      await Query.findByIdAndUpdate(query._id, updates);
    }
    console.log(`✅ Updated ${queriesWithoutAdminId.length} query documents`);
    
    // Step 7: Migrate Firm documents
    console.log('📊 Migrating Firm documents...');
    const firmsWithoutAdminId = await Firm.find({
      $or: [
        { adminId: { $exists: false } },
        { createdBy: { $exists: false } }
      ]
    });
    console.log(`Found ${firmsWithoutAdminId.length} firms without required fields`);
    
    for (const firm of firmsWithoutAdminId) {
      const updates = {};
      
      if (!firm.adminId) {
        updates.adminId = adminId;
      }
      
      if (!firm.createdBy) {
        updates.createdBy = adminId;
      }
      
      await Firm.findByIdAndUpdate(firm._id, updates);
    }
    console.log(`✅ Updated ${firmsWithoutAdminId.length} firm documents`);
    
    // Step 8: Verify migration
    console.log('🔍 Verifying migration...');
    const [userCount, clientCount, taskCount, documentCount, calendarEventCount, queryCount, firmCount] = await Promise.all([
      User.countDocuments({ adminId: { $exists: true } }),
      Client.countDocuments({ adminId: { $exists: true }, createdBy: { $exists: true } }),
      Task.countDocuments({ adminId: { $exists: true }, createdBy: { $exists: true } }),
      Document.countDocuments({ adminId: { $exists: true }, createdBy: { $exists: true } }),
      CalendarEvent.countDocuments({ adminId: { $exists: true } }),
      Query.countDocuments({ adminId: { $exists: true } }),
      Firm.countDocuments({ adminId: { $exists: true }, createdBy: { $exists: true } })
    ]);
    
    console.log(`✅ Verification complete:`);
    console.log(`   - Users with adminId: ${userCount}`);
    console.log(`   - Clients with adminId & createdBy: ${clientCount}`);
    console.log(`   - Tasks with adminId & createdBy: ${taskCount}`);
    console.log(`   - Documents with adminId & createdBy: ${documentCount}`);
    console.log(`   - Calendar Events with adminId: ${calendarEventCount}`);
    console.log(`   - Queries with adminId: ${queryCount}`);
    console.log(`   - Firms with adminId & createdBy: ${firmCount}`);
    
    // Step 9: Create index for better performance
    console.log('📈 Creating database indexes for performance...');
    await Promise.all([
      User.collection.createIndex({ adminId: 1 }),
      Client.collection.createIndex({ adminId: 1 }),
      Task.collection.createIndex({ adminId: 1 }),
      Document.collection.createIndex({ adminId: 1 }),
      CalendarEvent.collection.createIndex({ adminId: 1 }),
      Query.collection.createIndex({ adminId: 1 }),
      User.collection.createIndex({ adminId: 1, role: 1 }),
      Client.collection.createIndex({ adminId: 1, managerId: 1 }),
      Task.collection.createIndex({ adminId: 1, assigneeId: 1 }),
      Document.collection.createIndex({ adminId: 1, clientId: 1 }),
      CalendarEvent.collection.createIndex({ adminId: 1, assigneeId: 1 }),
      Firm.collection.createIndex({ adminId: 1, createdBy: 1 })
    ]);
    console.log('✅ Database indexes created');
    
    console.log('🎉 Data isolation migration completed successfully!');
    console.log(`📋 Summary:`);
    console.log(`   - First Admin ID: ${adminId}`);
    console.log(`   - All existing data assigned to this admin's domain`);
    console.log(`   - Ready for multi-admin isolation`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Rollback function (use with caution)
 */
async function rollbackMigration() {
  try {
    console.log('⚠️  Starting migration rollback...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-portal');
    
    // Remove adminId from all documents
    await Promise.all([
      User.updateMany({}, { $unset: { adminId: 1 } }),
      Client.updateMany({}, { $unset: { adminId: 1, createdBy: 1 } }),
      Task.updateMany({}, { $unset: { adminId: 1 } })
    ]);
    
    console.log('✅ Rollback completed - removed all adminId and createdBy fields');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'rollback') {
    rollbackMigration().catch(console.error);
  } else {
    migrateDataIsolation().catch(console.error);
  }
}

module.exports = {
  migrateDataIsolation,
  rollbackMigration
};
