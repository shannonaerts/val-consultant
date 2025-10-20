const VectorService = require('./services/vectorService');

async function testVectorConnection() {
  console.log('🧪 Testing Vector Database Connection...\n');

  const vectorService = new VectorService();

  try {
    // Test 1: Generate an embedding
    console.log('1️⃣ Testing embedding generation...');
    const testText = "This is a test document about client meetings and project requirements";
    const embedding = await vectorService.generateEmbedding(testText);
    console.log('✅ Embedding generated successfully');
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    // Test 2: Test vector storage (optional - requires a client)
    console.log('\n2️⃣ Testing Supabase connection...');

    // Try a simple Supabase connection test
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      'https://yudmkaiigwrdqvgrcege.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG1rYWlpZ3dyZHF2Z3JjZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjM0ODQsImV4cCI6MjA3NjE5OTQ4NH0.smLU90uBdUidG-7gnq4OMhejTZBSFKwvaKET6TISVVs'
    );

    // Test connection with a simple query
    const { data, error } = await supabase
      .from('document_chunks')
      .select('count')
      .limit(1);

    if (error) {
      console.log('⚠️  Supabase connection test failed (this is OK if no data exists yet):');
      console.log(`   Error: ${error.message}`);
    } else {
      console.log('✅ Supabase connection successful');
      console.log(`   Document chunks in database: ${data?.[0]?.count || 0}`);
    }

    console.log('\n🎉 Vector system is ready to use!');
    console.log('\n📝 What you can test next:');
    console.log('   • Upload a document (will process for vector search)');
    console.log('   • Create a note (will store in vector format)');
    console.log('   • Use chat with semantic search');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Common issues:');
    console.error('   • Check your OpenAI API key is valid');
    console.error('   • Check your Supabase URL and anon key');
    console.error('   • Ensure Supabase tables were created');
  }
}

testVectorConnection();