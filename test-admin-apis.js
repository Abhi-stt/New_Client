// Test script for admin functionality
const BASE_URL = 'http://localhost:5000/api';

async function testAdminAPIs() {
  console.log('🧪 Testing Admin Role APIs...\n');

  try {
    // Test 1: Login as admin
    console.log('1. Testing Admin Login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Admin login successful');
    console.log(`   User: ${loginData.user.name} (${loginData.user.role})`);
    console.log(`   ID: ${loginData.user.id}\n`);

    const userId = loginData.user.id;

    // Test 2: Get Clients
    console.log('2. Testing Get Clients...');
    const clientsResponse = await fetch(`${BASE_URL}/clients`);
    if (!clientsResponse.ok) {
      throw new Error(`Get clients failed: ${clientsResponse.status}`);
    }
    const clients = await clientsResponse.json();
    console.log(`✅ Found ${clients.length} clients\n`);

    // Test 3: Get Managers
    console.log('3. Testing Get Managers...');
    const managersResponse = await fetch(`${BASE_URL}/users/managers`);
    if (!managersResponse.ok) {
      throw new Error(`Get managers failed: ${managersResponse.status}`);
    }
    const managers = await managersResponse.json();
    console.log(`✅ Found ${managers.length} managers\n`);

    // Test 4: Get Team Members
    console.log('4. Testing Get Team Members...');
    const teamResponse = await fetch(`${BASE_URL}/users/team-members`);
    if (!teamResponse.ok) {
      throw new Error(`Get team members failed: ${teamResponse.status}`);
    }
    const teamMembers = await teamResponse.json();
    console.log(`✅ Found ${teamMembers.length} team members\n`);

    // Test 5: Get Documents
    console.log('5. Testing Get Documents...');
    const docsResponse = await fetch(`${BASE_URL}/documents?role=admin&userId=${userId}`);
    if (!docsResponse.ok) {
      throw new Error(`Get documents failed: ${docsResponse.status}`);
    }
    const documents = await docsResponse.json();
    console.log(`✅ Found ${documents.length} documents\n`);

    // Test 6: Get Calendar Events
    console.log('6. Testing Get Calendar Events...');
    const eventsResponse = await fetch(`${BASE_URL}/calendar-events?role=admin&userId=${userId}`);
    if (!eventsResponse.ok) {
      throw new Error(`Get calendar events failed: ${eventsResponse.status}`);
    }
    const events = await eventsResponse.json();
    console.log(`✅ Found ${events.length} calendar events\n`);

    // Test 7: Create Team Member
    console.log('7. Testing Create Team Member...');
    const createTeamResponse = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Team Member',
        email: 'testmember@demo.com',
        phone: '1234567890',
        password: 'password123',
        role: 'team_member',
        status: 'active'
      })
    });

    if (createTeamResponse.ok) {
      const newMember = await createTeamResponse.json();
      console.log(`✅ Team member created: ${newMember.name}`);
    } else {
      const error = await createTeamResponse.json();
      console.log(`⚠️  Create team member failed: ${error.error || createTeamResponse.status}`);
    }
    console.log('');

    // Test 8: Create Calendar Event
    console.log('8. Testing Create Calendar Event...');
    const createEventResponse = await fetch(`${BASE_URL}/calendar-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Calendar Event',
        description: 'Test event description',
        date: '2024-01-25',
        priority: 'medium',
        type: 'task',
        createdBy: userId
      })
    });

    if (createEventResponse.ok) {
      const newEvent = await createEventResponse.json();
      console.log(`✅ Calendar event created: ${newEvent.title}`);
    } else {
      const error = await createEventResponse.json();
      console.log(`⚠️  Create calendar event failed: ${error.error || createEventResponse.status}`);
    }
    console.log('');

    // Test 9: Test Document Upload Endpoint (without file)
    console.log('9. Testing Document Upload Endpoint...');
    const uploadResponse = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Document',
        description: 'Test document description',
        type: 'GST Return',
        userId: userId
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

    console.log('🎉 All Admin API tests completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Login: ✅`);
    console.log(`   - Clients: ${clients.length}`);
    console.log(`   - Managers: ${managers.length}`);
    console.log(`   - Team Members: ${teamMembers.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Calendar Events: ${events.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAdminAPIs(); 