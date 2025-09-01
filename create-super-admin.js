const axios = require('axios');

const HOST_URL = process.env.HOST_URL || 'http://localhost:5000';

async function createSuperAdmin() {
  try {
    console.log('🔍 Creating Super Admin and Demo Users...');
    
    // Create demo users including super admin
    const response = await axios.post(`${HOST_URL}/api/users/create-demo-users`);
    
    if (response.status === 200) {
      console.log('✅ All users created successfully!');
      
      console.log('\n📋 Super Admin Credentials (SECRET - Not shown in login page):');
      console.log('   Email: superadmin@demo.com');
      console.log('   Password: superadmin123');
      console.log('   Role: Super Admin');
      
      console.log('\n📋 Demo Credentials (Public - Shown in login page):');
      console.log('   Admin: admin@demo.com / admin123');
      console.log('   Manager: manager@demo.com / manager123');
      console.log('   Team: team@demo.com / team123');
      console.log('   Client: client@demo.com / client123');
      
      console.log('\n🔐 Super Admin is hidden from the login page demo credentials for security.');
      console.log('   You can use the super admin credentials directly in the login form.');
      
    } else {
      console.log('❌ Failed to create users');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server. Please start the backend server first:');
      console.log('   cd backend && node server.js');
    } else {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    }
  }
}

createSuperAdmin();
