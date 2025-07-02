const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testAPIs() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test 1: Login
    console.log('1. Testing Login...');
    const loginResult = await makeRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@demo.com', password: 'admin123' }
    });
    
    if (loginResult.status === 200) {
      console.log('✅ Login successful');
      const userId = loginResult.data.user.id;
      
      // Test 2: Get Clients
      console.log('\n2. Testing Get Clients...');
      const clientsResult = await makeRequest(`${BASE_URL}/clients`);
      if (clientsResult.status === 200) {
        console.log(`✅ Found ${clientsResult.data.length} clients`);
      } else {
        console.log(`❌ Get clients failed: ${clientsResult.status}`);
      }

      // Test 3: Get Managers
      console.log('\n3. Testing Get Managers...');
      const managersResult = await makeRequest(`${BASE_URL}/users/managers`);
      if (managersResult.status === 200) {
        console.log(`✅ Found ${managersResult.data.length} managers`);
      } else {
        console.log(`❌ Get managers failed: ${managersResult.status}`);
      }

      // Test 4: Get Team Members
      console.log('\n4. Testing Get Team Members...');
      const teamResult = await makeRequest(`${BASE_URL}/users/team-members`);
      if (teamResult.status === 200) {
        console.log(`✅ Found ${teamResult.data.length} team members`);
      } else {
        console.log(`❌ Get team members failed: ${teamResult.status}`);
      }

      // Test 5: Get Documents
      console.log('\n5. Testing Get Documents...');
      const docsResult = await makeRequest(`${BASE_URL}/documents?role=admin&userId=${userId}`);
      if (docsResult.status === 200) {
        console.log(`✅ Found ${docsResult.data.length} documents`);
      } else {
        console.log(`❌ Get documents failed: ${docsResult.status}`);
      }

      // Test 6: Get Calendar Events
      console.log('\n6. Testing Get Calendar Events...');
      const eventsResult = await makeRequest(`${BASE_URL}/calendar-events?role=admin&userId=${userId}`);
      if (eventsResult.status === 200) {
        console.log(`✅ Found ${eventsResult.data.length} calendar events`);
      } else {
        console.log(`❌ Get calendar events failed: ${eventsResult.status}`);
      }

      // Test 7: Get Tasks
      console.log('\n7. Testing Get Tasks...');
      const tasksResult = await makeRequest(`${BASE_URL}/tasks?role=admin&userId=${userId}`);
      if (tasksResult.status === 200) {
        console.log(`✅ Found ${tasksResult.data.length} tasks`);
      } else {
        console.log(`❌ Get tasks failed: ${tasksResult.status}`);
      }

      // Test 8: Create Team Member
      console.log('\n8. Testing Create Team Member...');
      const createTeamResult = await makeRequest(`${BASE_URL}/users`, {
        method: 'POST',
        body: {
          name: 'Test Team Member',
          email: 'testmember@demo.com',
          phone: '1234567890',
          password: 'password123',
          role: 'team_member',
          status: 'active'
        }
      });
      
      if (createTeamResult.status === 201) {
        console.log('✅ Team member created successfully');
      } else {
        console.log(`⚠️  Create team member failed: ${createTeamResult.status} - ${createTeamResult.data.error || 'Unknown error'}`);
      }

      // Test 9: Create Calendar Event
      console.log('\n9. Testing Create Calendar Event...');
      const createEventResult = await makeRequest(`${BASE_URL}/calendar-events`, {
        method: 'POST',
        body: {
          title: 'Test Calendar Event',
          description: 'Test event description',
          date: '2024-01-25',
          priority: 'medium',
          type: 'task',
          createdBy: userId
        }
      });
      
      if (createEventResult.status === 201) {
        console.log('✅ Calendar event created successfully');
      } else {
        console.log(`⚠️  Create calendar event failed: ${createEventResult.status} - ${createEventResult.data.error || 'Unknown error'}`);
      }

      console.log('\n🎉 API testing completed!');
      
    } else {
      console.log(`❌ Login failed: ${loginResult.status} - ${loginResult.data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIs(); 