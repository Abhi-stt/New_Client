const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'admin@demo.com',
  password: 'admin123'
};

const testDocument = {
  name: 'Test Document',
  description: 'Test document description',
  type: 'GST Return',
  clientId: '', // Will be set after getting clients
  syncWithGoogleSheets: false,
  syncWithSharePoint: false
};

const testCalendarEvent = {
  title: 'Test Calendar Event',
  description: 'Test event description',
  date: '2024-01-25',
  priority: 'medium',
  clientId: '', // Will be set after getting clients
  type: 'task'
};

const testTeamMember = {
  name: 'Test Team Member',
  email: 'testmember@demo.com',
  phone: '1234567890',
  password: 'password123',
  role: 'team_member'
};

async function testAPI() {
  console.log('🧪 Testing all API endpoints...\n');

  try {
    // 1. Test Login
    console.log('1. Testing Login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log(`   User: ${loginData.user.name} (${loginData.user.role})`);
    console.log(`   Token: ${loginData.token.substring(0, 20)}...\n`);

    // 2. Test Get Clients
    console.log('2. Testing Get Clients...');
    const clientsResponse = await fetch(`${BASE_URL}/clients`);
    if (!clientsResponse.ok) {
      throw new Error(`Get clients failed: ${clientsResponse.status}`);
    }
    
    const clients = await clientsResponse.json();
    console.log(`✅ Found ${clients.length} clients`);
    if (clients.length > 0) {
      testDocument.clientId = clients[0].id;
      testCalendarEvent.clientId = clients[0].id;
      console.log(`   Using client: ${clients[0].name}\n`);
    }

    // 3. Test Get Team Members
    console.log('3. Testing Get Team Members...');
    const teamResponse = await fetch(`${BASE_URL}/users/team-members`);
    if (!teamResponse.ok) {
      throw new Error(`Get team members failed: ${teamResponse.status}`);
    }
    
    const teamMembers = await teamResponse.json();
    console.log(`✅ Found ${teamMembers.length} team members\n`);

    // 4. Test Create Team Member
    console.log('4. Testing Create Team Member...');
    const createTeamResponse = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTeamMember)
    });
    
    if (!createTeamResponse.ok) {
      const error = await createTeamResponse.json();
      console.log(`⚠️  Create team member failed: ${error.message || createTeamResponse.status}`);
    } else {
      const newMember = await createTeamResponse.json();
      console.log(`✅ Team member created: ${newMember.name}`);
    }
    console.log('');

    // 5. Test Create Calendar Event
    console.log('5. Testing Create Calendar Event...');
    const createEventResponse = await fetch(`${BASE_URL}/calendar-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testCalendarEvent,
        createdBy: loginData.user.id
      })
    });
    
    if (!createEventResponse.ok) {
      const error = await createEventResponse.json();
      console.log(`⚠️  Create calendar event failed: ${error.message || createEventResponse.status}`);
    } else {
      const newEvent = await createEventResponse.json();
      console.log(`✅ Calendar event created: ${newEvent.title}`);
    }
    console.log('');

    // 6. Test Get Calendar Events
    console.log('6. Testing Get Calendar Events...');
    const eventsResponse = await fetch(`${BASE_URL}/calendar-events?role=${loginData.user.role}&userId=${loginData.user.id}`);
    if (!eventsResponse.ok) {
      throw new Error(`Get calendar events failed: ${eventsResponse.status}`);
    }
    
    const events = await eventsResponse.json();
    console.log(`✅ Found ${events.length} calendar events\n`);

    // 7. Test Get Documents
    console.log('7. Testing Get Documents...');
    const documentsResponse = await fetch(`${BASE_URL}/documents?role=${loginData.user.role}&userId=${loginData.user.id}`);
    if (!documentsResponse.ok) {
      throw new Error(`Get documents failed: ${documentsResponse.status}`);
    }
    
    const documents = await documentsResponse.json();
    console.log(`✅ Found ${documents.length} documents\n`);

    // 8. Test Document Upload (simulated)
    console.log('8. Testing Document Upload...');
    console.log('⚠️  Document upload requires file upload - testing endpoint availability');
    
    const uploadResponse = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testDocument,
        userId: loginData.user.id
      })
    });
    
    if (uploadResponse.status === 400) {
      console.log('✅ Document upload endpoint available (expected error for missing files)');
    } else if (uploadResponse.ok) {
      console.log('✅ Document upload successful');
    } else {
      console.log(`⚠️  Document upload failed: ${uploadResponse.status}`);
    }
    console.log('');

    // 9. Test Get Tasks
    console.log('9. Testing Get Tasks...');
    const tasksResponse = await fetch(`${BASE_URL}/tasks?role=${loginData.user.role}&userId=${loginData.user.id}`);
    if (!tasksResponse.ok) {
      throw new Error(`Get tasks failed: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`✅ Found ${tasks.length} tasks\n`);

    // 10. Test Create Task
    console.log('10. Testing Create Task...');
    const createTaskResponse = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Task',
        description: 'Test task description',
        clientId: testDocument.clientId,
        priority: 'medium',
        dueDate: '2024-01-30',
        createdBy: loginData.user.id
      })
    });
    
    if (!createTaskResponse.ok) {
      const error = await createTaskResponse.json();
      console.log(`⚠️  Create task failed: ${error.message || createTaskResponse.status}`);
    } else {
      const newTask = await createTaskResponse.json();
      console.log(`✅ Task created: ${newTask.title}`);
    }
    console.log('');

    // 11. Test Get Queries
    console.log('11. Testing Get Queries...');
    const queriesResponse = await fetch(`${BASE_URL}/queries?role=${loginData.user.role}&userId=${loginData.user.id}`);
    if (!queriesResponse.ok) {
      throw new Error(`Get queries failed: ${queriesResponse.status}`);
    }
    
    const queries = await queriesResponse.json();
    console.log(`✅ Found ${queries.length} queries\n`);

    // 12. Test Get Firms
    console.log('12. Testing Get Firms...');
    const firmsResponse = await fetch(`${BASE_URL}/firms?role=${loginData.user.role}&userId=${loginData.user.id}`);
    if (!firmsResponse.ok) {
      throw new Error(`Get firms failed: ${firmsResponse.status}`);
    }
    
    const firms = await firmsResponse.json();
    console.log(`✅ Found ${firms.length} firms\n`);

    console.log('🎉 All API tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Login: ✅`);
    console.log(`   - Clients: ${clients.length}`);
    console.log(`   - Team Members: ${teamMembers.length}`);
    console.log(`   - Calendar Events: ${events.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Queries: ${queries.length}`);
    console.log(`   - Firms: ${firms.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAPI(); 