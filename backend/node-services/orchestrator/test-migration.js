const axios = require('axios');

async function testMigrationAndChat() {
  console.log('🧪 Testing Vector Migration and Chat...\n');

  try {
    // Step 1: Get available clients
    console.log('1️⃣ Getting available clients...');
    const clientsResponse = await axios.get('http://localhost:3001/api/clients');
    const clients = clientsResponse.data;
    console.log(`   Found ${clients.length} clients:`);
    clients.forEach(client => {
      console.log(`   • ${client.name} (${client.id})`);
    });

    if (clients.length === 0) {
      console.log('❌ No clients found');
      return;
    }

    // Step 2: Migrate data for the first client
    const testClient = clients.find(c => c.name.includes('Trafigura')) || clients[0];
    console.log(`\n2️⃣ Migrating data for: ${testClient.name}...`);

    try {
      const migrationResponse = await axios.post(`http://localhost:3001/api/migrate-to-vector/${testClient.id}`);
      console.log('✅ Migration completed!');
      console.log(`   ${JSON.stringify(migrationResponse.data.stats, null, 2)}`);
    } catch (migrationError) {
      console.log('⚠️ Migration failed (this is OK for testing):');
      console.log(`   Error: ${migrationError.message}`);
    }

    // Step 3: Create a test note
    console.log('\n3️⃣ Creating a test note about asset transfer...');
    try {
      const noteResponse = await axios.post('http://localhost:3001/api/notes', {
        clientId: testClient.id,
        content: 'Important note about asset transfer: The company needs to transfer all intellectual property assets, including patents, trademarks, and copyrights. Additionally, all physical assets such as office equipment, inventory, and real estate holdings must be properly documented and transferred. The transfer should comply with legal requirements and include proper valuation.',
        createdBy: 'Test User'
      });
      console.log('✅ Test note created successfully');
    } catch (noteError) {
      console.log('⚠️ Note creation failed:', noteError.message);
    }

    // Step 4: Test chat with asset transfer question
    console.log('\n4️⃣ Testing chat with asset transfer question...');
    try {
      const chatResponse = await axios.post('http://localhost:3001/api/chat', {
        clientId: testClient.id,
        message: 'What assets need to transfer to the new company?'
      });

      console.log('✅ Chat response received:');
      console.log(`   Response: ${chatResponse.data.message}`);
      console.log(`   Sources: ${JSON.stringify(chatResponse.data.sources, null, 2)}`);
    } catch (chatError) {
      console.log('❌ Chat test failed:', chatError.message);
      if (chatError.response) {
        console.log(`   Status: ${chatError.response.status}`);
        console.log(`   Data: ${JSON.stringify(chatError.response.data, null, 2)}`);
      }
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMigrationAndChat();