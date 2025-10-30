#!/usr/bin/env node

/**
 * Simple connection test for Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Test configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 Configuration:');
  console.log(`SUPABASE_URL: ${supabaseUrl}`);
  console.log(`SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ ERROR: Missing required environment variables');
    return false;
  }

  console.log('\n🔍 Testing Anon Key Connection...');
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient.from('document_chunks').select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Anon Key Connection Failed:', error.message);
    } else {
      console.log('✅ Anon Key Connection Successful');
      console.log(`📊 Document chunks count: ${data?.[0]?.count || 0}`);
    }
  } catch (error) {
    console.log('❌ Anon Key Connection Error:', error.message);
  }

  console.log('\n🔍 Testing Service Role Connection...');
  if (supabaseServiceKey) {
    try {
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await serviceClient.from('document_chunks').select('count', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Service Role Connection Failed:', error.message);
      } else {
        console.log('✅ Service Role Connection Successful');
        console.log(`📊 Document chunks count: ${data?.[0]?.count || 0}`);
      }
    } catch (error) {
      console.log('❌ Service Role Connection Error:', error.message);
    }
  } else {
    console.log('⚠️  Service Role Key not set, skipping service role test');
  }

  console.log('\n🔍 Checking if Tables Exist...');
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    const tables = [
      'document_chunks',
      'meeting_transcripts',
      'vector_notes',
      'vector_tasks',
      'research_data',
      'client_privacy_settings',
      'vector_access_log'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await serviceClient.from(table).select('count', { count: 'exact', head: true });
        console.log(`${error ? '❌' : '✅'} Table "${table}": ${error ? error.message : 'Exists'}`);
      } catch (tableError) {
        console.log(`❌ Table "${table}": ${tableError.message}`);
      }
    }
  } catch (error) {
    console.log('❌ Error checking tables:', error.message);
  }

  console.log('\n🔍 Checking RLS Status...');
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    const { data, error } = await serviceClient.rpc('check_rls_status');

    if (error) {
      console.log('⚠️  Could not check RLS status (function may not exist):', error.message);
    } else {
      console.log('✅ RLS Status Check Results:');
      console.log(data);
    }
  } catch (error) {
    console.log('⚠️  Could not check RLS status:', error.message);
  }

  console.log('\n📝 Summary:');
  console.log('If you see connection errors above, it means:');
  console.log('1. The SQL security script hasn\'t been executed yet');
  console.log('2. Network connectivity issues');
  console.log('3. Invalid API keys');
  console.log('\nNext steps:');
  console.log('1. Run the SQL script: schema/fix_rls_security.sql');
  console.log('2. Then run: node test_security.js');

  return true;
}

testSupabaseConnection().catch(console.error);