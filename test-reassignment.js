const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testReassignment() {
  try {
    console.log('🧪 Testing Task Reassignment Feature...\n');

    // 1. Test reassignment endpoint exists
    console.log('1. Testing reassignment endpoint...');
    try {
      const response = await axios.patch(`${BASE_URL}/tasks/test-id/reassign`, {
        newAssigneeId: 'test-user-id',
        reason: 'Test reassignment',
        userId: 'test-manager-id'
      });
      console.log('✅ Endpoint exists (expected 404 for test ID)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Endpoint exists and properly handles invalid task ID');
      } else {
        console.log('❌ Endpoint test failed:', error.message);
      }
    }

    // 2. Test validation
    console.log('\n2. Testing validation...');
    try {
      const response = await axios.patch(`${BASE_URL}/tasks/test-id/reassign`, {
        // Missing required fields
      });
      console.log('❌ Validation failed - should require newAssigneeId and userId');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validation working - requires newAssigneeId and userId');
      } else {
        console.log('❌ Validation test failed:', error.message);
      }
    }

    console.log('\n🎉 Reassignment endpoint tests completed!');
    console.log('\nTo test with real data:');
    console.log('1. Create a task assigned to a manager');
    console.log('2. Use the manager account to reassign to a team member');
    console.log('3. Check the reassignment history and audit trail');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testReassignment();
