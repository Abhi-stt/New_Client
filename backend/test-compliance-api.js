// Test script to verify compliance API
const fetch = require('node-fetch');

async function testComplianceAPI() {
  try {
    console.log('Testing compliance API...');
    
    // First, get all clients to find a valid client ID
    const clientsResponse = await fetch('http://localhost:5000/api/clients');
    const clients = await clientsResponse.json();
    
    if (clients.length === 0) {
      console.log('❌ No clients found. Please create a client first.');
      return;
    }
    
    const clientId = clients[0].id;
    console.log(`✅ Using client: ${clients[0].name} (ID: ${clientId})`);
    
    // Test compliance endpoint
    const complianceResponse = await fetch(`http://localhost:5000/api/clients/${clientId}/compliance`);
    
    if (complianceResponse.ok) {
      const complianceData = await complianceResponse.json();
      console.log('✅ Compliance API is working!');
      console.log('Compliance data structure:');
      console.log(`- Recurring items: ${complianceData.recurring?.length || 0}`);
      console.log(`- Upcoming items: ${complianceData.upcoming?.length || 0}`);
      console.log(`- Overdue items: ${complianceData.overdue?.length || 0}`);
      
      if (complianceData.summary) {
        console.log('Summary:', complianceData.summary);
      }
      
      // Show sample items
      if (complianceData.recurring && complianceData.recurring.length > 0) {
        console.log('\nSample recurring item:');
        console.log(JSON.stringify(complianceData.recurring[0], null, 2));
      }
      
    } else {
      console.log('❌ Compliance API failed with status:', complianceResponse.status);
      const errorText = await complianceResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testComplianceAPI();
