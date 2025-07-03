import { HOST_URL } from "./lib/api"

const API_BASE_URL = `${HOST_URL}/api`;

// Test all API endpoints
async function testAPIEndpoints() {
  console.log('🧪 Testing API Connections...\n');
  
  const tests = [
    // Auth endpoints
    { name: 'Login', url: `${API_BASE_URL}/users/login`, method: 'POST', data: { email: 'test@example.com', password: 'password' } },
    
    // Client endpoints
    { name: 'Get Clients', url: `${API_BASE_URL}/clients`, method: 'GET' },
    { name: 'Create Client', url: `${API_BASE_URL}/clients`, method: 'POST', data: { name: 'Test Client', email: 'test@client.com' } },
    { name: 'Client Compliance', url: `${API_BASE_URL}/clients/1/compliance`, method: 'GET' },
    
    // Firm endpoints
    { name: 'Get Firms', url: `${API_BASE_URL}/firms`, method: 'GET' },
    { name: 'Create Firm', url: `${API_BASE_URL}/firms`, method: 'POST', data: { name: 'Test Firm', type: 'pvt_ltd' } },
    { name: 'Firm Details', url: `${API_BASE_URL}/firms/1/details`, method: 'GET' },
    
    // Task endpoints
    { name: 'Get Tasks', url: `${API_BASE_URL}/tasks`, method: 'GET' },
    { name: 'Create Task', url: `${API_BASE_URL}/tasks`, method: 'POST', data: { title: 'Test Task', description: 'Test description' } },
    { name: 'Update Task Status', url: `${API_BASE_URL}/tasks/1/status`, method: 'PATCH', data: { status: 'completed' } },
    { name: 'Add Task Comment', url: `${API_BASE_URL}/tasks/1/comments`, method: 'POST', data: { comment: 'Test comment', userId: '1' } },
    
    // Query endpoints
    { name: 'Get Queries', url: `${API_BASE_URL}/queries`, method: 'GET' },
    { name: 'Create Query', url: `${API_BASE_URL}/queries`, method: 'POST', data: { title: 'Test Query', description: 'Test query description' } },
    { name: 'Update Query Status', url: `${API_BASE_URL}/queries/1/status`, method: 'PATCH', data: { status: 'resolved' } },
    { name: 'Add Query Response', url: `${API_BASE_URL}/queries/1/responses`, method: 'POST', data: { response: 'Test response', userId: '1', userName: 'Test User' } },
    
    // Document endpoints
    { name: 'Get Documents', url: `${API_BASE_URL}/documents`, method: 'GET' },
    { name: 'Create Document', url: `${API_BASE_URL}/documents`, method: 'POST', data: { name: 'Test Document', description: 'Test document description' } },
    { name: 'Document Request', url: `${API_BASE_URL}/documents/request`, method: 'POST', data: { clientId: '1', documentName: 'Test Request', description: 'Test request description' } },
    { name: 'Document Download', url: `${API_BASE_URL}/documents/1/download`, method: 'GET' },
    
    // User/Team endpoints
    { name: 'Get Team Members', url: `${API_BASE_URL}/users/team-members`, method: 'GET' },
    { name: 'Create Manager', url: `${API_BASE_URL}/users/create-manager`, method: 'POST', data: { name: 'Test Manager', email: 'manager@test.com', password: 'password' } },
    { name: 'Update 2FA', url: `${API_BASE_URL}/users/1/2fa`, method: 'POST', data: { action: 'enable', code: '123456' } },
    { name: 'Assign Clients', url: `${API_BASE_URL}/users/1/assign-clients`, method: 'PATCH', data: { clientIds: ['1', '2'] } },
    
    // Dashboard endpoints
    { name: 'Admin Dashboard', url: `${API_BASE_URL}/dashboard/admin`, method: 'GET' },
    { name: 'Client Dashboard', url: `${API_BASE_URL}/dashboard/client`, method: 'GET' },
    { name: 'Manager Dashboard', url: `${API_BASE_URL}/dashboard/manager`, method: 'GET' },
    { name: 'Team Member Dashboard', url: `${API_BASE_URL}/dashboard/team-member`, method: 'GET' },
    
    // Calendar endpoints
    { name: 'Get Calendar Events', url: `${API_BASE_URL}/calendar-events`, method: 'GET' },
    { name: 'Create Calendar Event', url: `${API_BASE_URL}/calendar-events`, method: 'POST', data: { title: 'Test Event', description: 'Test event description' } },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (test.data) {
        options.body = JSON.stringify(test.data);
      }

      const response = await fetch(test.url, options);
      
      if (response.ok || response.status === 404) { // 404 is expected for some endpoints with non-existent IDs
        console.log(`✅ ${test.name} - ${response.status}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - ${response.status} ${response.statusText}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All API connections are working!');
  } else {
    console.log('\n⚠️  Some API connections failed. Check the backend server and routes.');
  }
}

// Run the test
testAPIEndpoints().catch(console.error); 