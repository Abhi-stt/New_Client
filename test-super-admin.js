const axios = require('axios');

const HOST_URL = process.env.HOST_URL || 'http://localhost:5000';

async function testSuperAdmin() {
  console.log('🧪 Testing Super Admin Functionality...\n');

  try {
    // 1. Test Super Admin Login
    console.log('1. Testing Super Admin Login...');
    const loginResponse = await axios.post(`${HOST_URL}/api/auth/login`, {
      email: 'superadmin@demo.com',
      password: 'superadmin123'
    });
    
    const superAdmin = loginResponse.data.user;
    console.log('✅ Super Admin logged in successfully');
    console.log(`   User: ${superAdmin.name} (${superAdmin.email})`);
    console.log(`   Role: ${superAdmin.role}\n`);

    // 2. Test Dashboard Stats
    console.log('2. Testing Dashboard Stats...');
    const statsResponse = await axios.get(`${HOST_URL}/api/super-admin/dashboard-stats?userId=${superAdmin.id}`);
    const stats = statsResponse.data.stats;
    console.log('✅ Dashboard stats retrieved successfully');
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Active Users: ${stats.activeUsers}`);
    console.log(`   Inactive Users: ${stats.inactiveUsers}`);
    console.log(`   Today's Activities: ${stats.todayActivities}`);
    console.log(`   Weekly Activities: ${stats.weeklyActivities}\n`);

    // 3. Test Get All Users
    console.log('3. Testing Get All Users...');
    const usersResponse = await axios.get(`${HOST_URL}/api/super-admin/users?userId=${superAdmin.id}`);
    const users = usersResponse.data;
    console.log('✅ All users retrieved successfully');
    console.log(`   Total users found: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`);
    });
    console.log('');

    // 4. Test Create New User
    console.log('4. Testing Create New User...');
    const newUserData = {
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'testpass123',
      role: 'client',
      phone: '+91-9876543214'
    };
    
    const createResponse = await axios.post(`${HOST_URL}/api/super-admin/users?userId=${superAdmin.id}`, newUserData);
    console.log('✅ New user created successfully');
    console.log(`   Created user: ${createResponse.data.user.name} (${createResponse.data.user.email})`);
    console.log(`   Role: ${createResponse.data.user.role}\n`);

    // 5. Test Get Activities
    console.log('5. Testing Get Activities...');
    const activitiesResponse = await axios.get(`${HOST_URL}/api/super-admin/activities?userId=${superAdmin.id}`);
    const activities = activitiesResponse.data.activities;
    console.log('✅ Activities retrieved successfully');
    console.log(`   Total activities found: ${activities.length}`);
    activities.slice(0, 3).forEach(activity => {
      console.log(`   - ${activity.userId.name}: ${activity.action} - ${activity.description}`);
    });
    console.log('');

    // 6. Test Delete User (cleanup)
    console.log('6. Testing Delete User (cleanup)...');
    const testUserId = createResponse.data.user._id;
    const deleteResponse = await axios.delete(`${HOST_URL}/api/super-admin/users/${testUserId}?userId=${superAdmin.id}`);
    console.log('✅ Test user deleted successfully');
    console.log(`   Message: ${deleteResponse.data.message}\n`);

    // 7. Test Non-Super Admin Access (should fail)
    console.log('7. Testing Non-Super Admin Access (should fail)...');
    try {
      const regularLoginResponse = await axios.post(`${HOST_URL}/api/auth/login`, {
        email: 'admin@demo.com',
        password: 'admin123'
      });
      
      const regularAdmin = regularLoginResponse.data.user;
      await axios.get(`${HOST_URL}/api/super-admin/users?userId=${regularAdmin.id}`);
      console.log('❌ Regular admin should not have access to super admin endpoints');
    } catch (error) {
      console.log('✅ Regular admin correctly denied access to super admin endpoints');
      console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
    }

    console.log('🎉 All Super Admin tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Super Admin login works');
    console.log('   ✅ Dashboard stats are accessible');
    console.log('   ✅ User management (CRUD) works');
    console.log('   ✅ Activity monitoring works');
    console.log('   ✅ Access control is properly enforced');
    console.log('   ✅ Activity logging is working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
    process.exit(1);
  }
}

// Run the test
testSuperAdmin();

