const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/email';
const TEST_USER_ID = '507f1f77bcf86cd799439011';

async function testEmailIntegration() {
  console.log('🧪 Testing Email Integration...\n');

  try {
    // Test 1: Get Gmail OAuth URL
    console.log('1. Testing Gmail OAuth URL generation...');
    const authResponse = await axios.get(`${BASE_URL}/gmail/auth/${TEST_USER_ID}`);
    console.log('✅ OAuth URL generated:', authResponse.data.authUrl ? 'Success' : 'Failed');
    console.log('   URL:', authResponse.data.authUrl);
    console.log('');

    // Test 2: Check email account status (should be disconnected initially)
    console.log('2. Testing email account status...');
    const accountResponse = await axios.get(`${BASE_URL}/account/${TEST_USER_ID}`);
    console.log('✅ Account status retrieved:', accountResponse.data.connected ? 'Connected' : 'Not Connected');
    console.log('   Data:', accountResponse.data);
    console.log('');

    // Test 3: Test forwarding rules CRUD
    console.log('3. Testing forwarding rules...');
    
    // Create a test rule
    const testRule = {
      userId: TEST_USER_ID,
      ruleName: 'Test GST Rule',
      conditions: {
        senderDomain: '@gst.gov.in',
        subjectKeywords: ['GST', 'Return']
      },
      actions: {
        forwardType: 'summary',
        recipients: [
          { type: 'role', value: 'manager' },
          { type: 'email', value: 'admin@example.com' }
        ],
        addNote: 'This is a test rule'
      }
    };

    const createRuleResponse = await axios.post(`${BASE_URL}/forwarding-rules`, testRule);
    console.log('✅ Rule created:', createRuleResponse.data.message);
    const ruleId = createRuleResponse.data.rule._id;
    console.log('   Rule ID:', ruleId);
    console.log('');

    // Get all rules
    const getRulesResponse = await axios.get(`${BASE_URL}/forwarding-rules/${TEST_USER_ID}`);
    console.log('✅ Rules retrieved:', getRulesResponse.data.length, 'rules found');
    console.log('');

    // Update rule
    const updateData = { ruleName: 'Updated Test GST Rule' };
    const updateRuleResponse = await axios.put(`${BASE_URL}/forwarding-rules/${ruleId}`, updateData);
    console.log('✅ Rule updated:', updateRuleResponse.data.message);
    console.log('');

    // Test 4: Test email sync (will fail without OAuth, but should handle gracefully)
    console.log('4. Testing email sync...');
    try {
      const syncResponse = await axios.post(`${BASE_URL}/sync/${TEST_USER_ID}`, { maxResults: 10 });
      console.log('✅ Email sync:', syncResponse.data.message);
      console.log('   Synced emails:', syncResponse.data.count);
    } catch (syncError) {
      console.log('⚠️  Email sync failed (expected without OAuth):', syncError.response?.data?.error || syncError.message);
    }
    console.log('');

    // Test 5: Test email retrieval (will be empty without sync)
    console.log('5. Testing email retrieval...');
    const emailsResponse = await axios.get(`${BASE_URL}/emails/${TEST_USER_ID}?limit=5`);
    console.log('✅ Emails retrieved:', emailsResponse.data.emails.length, 'emails');
    console.log('   Pagination:', emailsResponse.data.pagination);
    console.log('');

    // Test 6: Test audit logs
    console.log('6. Testing audit logs...');
    const auditResponse = await axios.get(`${BASE_URL}/audit-logs/${TEST_USER_ID}?limit=10`);
    console.log('✅ Audit logs retrieved:', auditResponse.data.logs.length, 'logs');
    console.log('');

    // Clean up: Delete test rule
    console.log('7. Cleaning up test data...');
    const deleteRuleResponse = await axios.delete(`${BASE_URL}/forwarding-rules/${ruleId}`);
    console.log('✅ Test rule deleted:', deleteRuleResponse.data.message);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up Google OAuth2 credentials in your .env file');
    console.log('2. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI');
    console.log('3. Install dependencies: npm install googleapis');
    console.log('4. Test the complete OAuth flow by visiting the Email page');
    console.log('5. Create forwarding rules and test email syncing');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEmailIntegration();
