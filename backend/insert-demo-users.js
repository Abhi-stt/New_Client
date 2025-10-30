const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'manager', 'team_member', 'client'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'active' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  firmIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }],
  phone: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorFailedAttempts: { type: Number, default: 0 },
  twoFactorLockedUntil: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Demo users to insert
const DEMO_USERS = [
  {
    email: 'superadmin@demo.com',
    password: 'superadmin123',
    name: 'Super Admin',
    role: 'super_admin',
    status: 'active',
    phone: null,
    twoFactorEnabled: false,
    isActive: true,
  },
  {
    email: 'admin@demo.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    status: 'active',
    phone: null,
    twoFactorEnabled: false,
    isActive: true,
  },
  {
    email: 'manager@demo.com',
    password: 'manager123',
    name: 'Manager User',
    role: 'manager',
    status: 'active',
    phone: null,
    twoFactorEnabled: false,
    isActive: true,
  },
  {
    email: 'team@demo.com',
    password: 'team123',
    name: 'Team Member',
    role: 'team_member',
    status: 'active',
    phone: null,
    twoFactorEnabled: false,
    isActive: true,
  },
  {
    email: 'client@demo.com',
    password: 'client123',
    name: 'Client User',
    role: 'client',
    status: 'active',
    phone: null,
    twoFactorEnabled: false,
    isActive: true,
  },
];

/**
 * Insert or update demo users
 */
async function insertDemoUsers() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/client-portal';

    console.log('🚀 Starting Demo Users Insertion...\n');
    console.log(`🔌 Connecting to MongoDB...`);
    console.log(`URI: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}\n`);

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    let superAdminId = null;
    let adminId = null;

    // Statistics
    const stats = {
      inserted: 0,
      updated: 0,
      errors: 0,
    };

    // First, insert/update Super Admin
    console.log('📦 Processing users...\n');
    
    // First pass: Insert/Update all users and collect IDs
    for (const userData of DEMO_USERS) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });

        if (existingUser) {
          // Update existing user
          existingUser.password = userData.password;
          existingUser.name = userData.name;
          existingUser.role = userData.role;
          existingUser.status = userData.status;
          existingUser.isActive = userData.isActive;
          existingUser.twoFactorEnabled = userData.twoFactorEnabled;
          if (userData.phone !== null) {
            existingUser.phone = userData.phone;
          }
          await existingUser.save();

          console.log(`✏️  Updated: ${userData.email} (${userData.role})`);
          stats.updated++;

          // Store IDs for relationships
          if (userData.role === 'super_admin') {
            superAdminId = existingUser._id;
          } else if (userData.role === 'admin') {
            adminId = existingUser._id;
          }
        } else {
          // Create new user (relationships will be set in second pass)
          const newUser = new User(userData);
          await newUser.save();

          console.log(`✅ Inserted: ${userData.email} (${userData.role})`);
          stats.inserted++;

          // Store IDs for relationships
          if (userData.role === 'super_admin') {
            superAdminId = newUser._id;
          } else if (userData.role === 'admin') {
            adminId = newUser._id;
          }
        }
      } catch (error) {
        console.error(`❌ Error with ${userData.email}: ${error.message}`);
        stats.errors++;
      }
    }

    // Second pass: Set up relationships now that we have all IDs
    console.log('\n🔗 Setting up relationships...');
    
    // Get IDs again to make sure we have them (in case users already existed)
    if (!superAdminId) {
      const superAdmin = await User.findOne({ email: 'superadmin@demo.com' });
      if (superAdmin) superAdminId = superAdmin._id;
    }
    
    if (!adminId) {
      const admin = await User.findOne({ email: 'admin@demo.com' });
      if (admin) adminId = admin._id;
    }

    // Link admin to super admin
    if (superAdminId && adminId) {
      const adminUser = await User.findOne({ email: 'admin@demo.com' });
      if (adminUser) {
        let updated = false;
        if (!adminUser.adminId || adminUser.adminId.toString() !== superAdminId.toString()) {
          adminUser.adminId = superAdminId;
          updated = true;
        }
        if (!adminUser.createdBy || adminUser.createdBy.toString() !== superAdminId.toString()) {
          adminUser.createdBy = superAdminId;
          updated = true;
        }
        if (updated) {
          await adminUser.save();
          console.log('  ✓ Linked admin to super admin');
        }
      }
    }

    // Link other users to admin
    if (adminId) {
      const usersToLink = [
        { email: 'manager@demo.com', needsManagerId: true },
        { email: 'team@demo.com', needsManagerId: false },
        { email: 'client@demo.com', needsManagerId: false },
      ];
      
      for (const { email, needsManagerId } of usersToLink) {
        const user = await User.findOne({ email });
        if (user) {
          let updated = false;
          if (!user.adminId || user.adminId.toString() !== adminId.toString()) {
            user.adminId = adminId;
            updated = true;
          }
          if (!user.createdBy || user.createdBy.toString() !== adminId.toString()) {
            user.createdBy = adminId;
            updated = true;
          }
          if (needsManagerId && (!user.managerId || user.managerId.toString() !== adminId.toString())) {
            user.managerId = adminId;
            updated = true;
          }
          if (updated) {
            await user.save();
            console.log(`  ✓ Linked ${user.role} to admin`);
          }
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Insertion Summary');
    console.log('='.repeat(60));
    console.log(`✅ Inserted:  ${stats.inserted}`);
    console.log(`✏️  Updated:   ${stats.updated}`);
    console.log(`❌ Errors:    ${stats.errors}`);
    console.log('='.repeat(60));

    console.log('\n📋 Demo Credentials:');
    console.log('----------------------------------------');
    console.log('Super Admin: superadmin@demo.com / superadmin123');
    console.log('Admin:       admin@demo.com / admin123');
    console.log('Manager:     manager@demo.com / manager123');
    console.log('Team Member: team@demo.com / team123');
    console.log('Client:      client@demo.com / client123');
    console.log('----------------------------------------');

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Demo users inserted successfully!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Insertion failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run insertion
if (require.main === module) {
  insertDemoUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { insertDemoUsers };

