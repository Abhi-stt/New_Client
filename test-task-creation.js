const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testTaskCreation() {
  try {
    console.log('🧪 Testing Task Creation for Different Roles...\n');

    // Test 1: Check if assignable users endpoint works for admin role
    console.log('1. Testing assignable users endpoint for admin...');
    try {
      const response = await axios.get(`${BASE_URL}/tasks/users/assignable?role=admin&userId=test-admin-id`);
      console.log('✅ Assignable users endpoint working for admin');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Assignable users endpoint failed for admin:', error.response?.data || error.message);
    }

    // Test 2: Check if clients endpoint works for admin role
    console.log('\n2. Testing clients endpoint for admin...');
    try {
      const response = await axios.get(`${BASE_URL}/clients?role=admin&userId=test-admin-id`);
      console.log('✅ Clients endpoint working for admin');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Clients endpoint failed for admin:', error.response?.data || error.message);
    }

    // Test 3: Check if services endpoint works for admin role
    console.log('\n3. Testing services endpoint for admin...');
    try {
      const response = await axios.get(`${BASE_URL}/services?role=admin&userId=test-admin-id`);
      console.log('✅ Services endpoint working for admin');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Services endpoint failed for admin:', error.response?.data || error.message);
    }

    // Test 4: Test task creation with minimal data
    console.log('\n4. Testing task creation endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/tasks`, {
        title: 'Test Task',
        description: 'Test Description',
        createdBy: 'test-admin-id',
        assigneeId: 'test-user-id',
        priority: 'medium'
      });
      console.log('✅ Task creation endpoint working');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Task creation failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Task creation tests completed!');
    console.log('\nCommon issues to check:');
    console.log('1. Database connection');
    console.log('2. User authentication');
    console.log('3. Role-based permissions');
    console.log('4. Required field validation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTaskCreation();
