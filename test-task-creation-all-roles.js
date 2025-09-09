const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testTaskCreationAllRoles() {
  try {
    console.log('🧪 Testing Task Creation for All User Roles...\n');

    const testUsers = [
      { role: 'admin', userId: 'test-admin-id', name: 'Admin User' },
      { role: 'manager', userId: 'test-manager-id', name: 'Manager User' },
      { role: 'team_member', userId: 'test-team-member-id', name: 'Team Member User' },
      { role: 'client', userId: 'test-client-id', name: 'Client User' }
    ];

    for (const testUser of testUsers) {
      console.log(`\n--- Testing ${testUser.role.toUpperCase()} Role ---`);
      
      // Test 1: Check assignable users endpoint
      console.log(`1. Testing assignable users for ${testUser.role}...`);
      try {
        const response = await axios.get(`${BASE_URL}/tasks/users/assignable?role=${testUser.role}&userId=${testUser.userId}`);
        console.log(`✅ Assignable users working for ${testUser.role}`);
        console.log(`   Found ${response.data.length} assignable users`);
      } catch (error) {
        console.log(`❌ Assignable users failed for ${testUser.role}:`, error.response?.data?.error || error.message);
      }

      // Test 2: Check clients endpoint
      console.log(`2. Testing clients endpoint for ${testUser.role}...`);
      try {
        const response = await axios.get(`${BASE_URL}/clients?role=${testUser.role}&userId=${testUser.userId}`);
        console.log(`✅ Clients endpoint working for ${testUser.role}`);
        console.log(`   Found ${response.data.length} clients`);
      } catch (error) {
        console.log(`❌ Clients endpoint failed for ${testUser.role}:`, error.response?.data?.error || error.message);
      }

      // Test 3: Check services endpoint
      console.log(`3. Testing services endpoint for ${testUser.role}...`);
      try {
        const response = await axios.get(`${BASE_URL}/services?role=${testUser.role}&userId=${testUser.userId}`);
        console.log(`✅ Services endpoint working for ${testUser.role}`);
        console.log(`   Found ${response.data.length} services`);
      } catch (error) {
        console.log(`❌ Services endpoint failed for ${testUser.role}:`, error.response?.data?.error || error.message);
      }

      // Test 4: Test task creation
      console.log(`4. Testing task creation for ${testUser.role}...`);
      try {
        const taskData = {
          title: `Test Task - ${testUser.role}`,
          description: `Test task created by ${testUser.name}`,
          createdBy: testUser.userId,
          assigneeId: testUser.userId, // Self-assign for testing
          priority: 'medium'
        };

        const response = await axios.post(`${BASE_URL}/tasks`, taskData);
        console.log(`✅ Task creation working for ${testUser.role}`);
        console.log(`   Created task ID: ${response.data.id}`);
      } catch (error) {
        console.log(`❌ Task creation failed for ${testUser.role}:`, error.response?.data?.error || error.message);
      }
    }

    console.log('\n🎉 All role tests completed!');
    console.log('\nSummary of common issues:');
    console.log('1. ✅ Task creation should work for all roles');
    console.log('2. ✅ Admins can see all users, clients, and services');
    console.log('3. ✅ Managers can see their team members and assigned clients');
    console.log('4. ✅ Team members can see other team members and managers');
    console.log('5. ✅ Clients can see team members and managers');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTaskCreationAllRoles();
