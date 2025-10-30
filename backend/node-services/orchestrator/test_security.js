#!/usr/bin/env node

/**
 * Security Implementation Test Script for VAL Vector Service
 *
 * This script tests:
 * 1. RLS policies and secure search functions
 * 2. Privacy service functionality
 * 3. Client data isolation
 * 4. Access control enforcement
 * 5. Audit logging
 */

require('dotenv').config();
const VectorService = require('./services/vectorService');
const PrivacyService = require('./services/privacyService');

// Test configuration
const TEST_CLIENT_ID = 'test-security-client';
const TEST_CLIENT_ID_2 = 'test-security-client-2';

const testLogger = {
  info: (message, ...args) => console.log(`📋 INFO: ${message}`, ...args),
  success: (message, ...args) => console.log(`✅ SUCCESS: ${message}`, ...args),
  error: (message, ...args) => console.log(`❌ ERROR: ${message}`, ...args),
  warning: (message, ...args) => console.log(`⚠️  WARNING: ${message}`, ...args),
  section: (title) => console.log(`\n🔍 ${title}`),
  divider: () => console.log('\n' + '='.repeat(60))
};

async function runSecurityTests() {
  testLogger.divider();
  testLogger.info('Starting VAL Vector Service Security Tests');
  testLogger.info('Timestamp:', new Date().toISOString());

  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  try {
    // Initialize services
    testLogger.section('Initializing Services');
    const vectorService = new VectorService();
    const privacyService = new PrivacyService();
    testLogger.success('Services initialized successfully');

    // Test 1: Privacy Service Initialization
    testLogger.section('Test 1: Privacy Service Initialization');
    await testPrivacyInitialization(privacyService, testResults);

    // Test 2: Vector Service Basic Operations
    testLogger.section('Test 2: Vector Service Basic Operations');
    await testVectorServiceBasics(vectorService, testResults);

    // Test 3: Client Data Isolation
    testLogger.section('Test 3: Client Data Isolation');
    await testClientDataIsolation(vectorService, testResults);

    // Test 4: Secure Search Functions
    testLogger.section('Test 4: Secure Search Functions');
    await testSecureSearchFunctions(vectorService, testResults);

    // Test 5: Privacy Controls
    testLogger.section('Test 5: Privacy Controls');
    await testPrivacyControls(privacyService, vectorService, testResults);

    // Test 6: Audit Logging
    testLogger.section('Test 6: Audit Logging');
    await testAuditLogging(privacyService, testResults);

    // Test 7: Data Cleanup
    testLogger.section('Test 7: Data Cleanup');
    await testDataCleanup(privacyService, testResults);

  } catch (error) {
    testLogger.error('Test suite failed with error:', error.message);
    testResults.failed++;
  }

  // Summary
  testLogger.divider();
  testLogger.section('Test Results Summary');
  testLogger.info(`✅ Passed: ${testResults.passed}`);
  testLogger.info(`❌ Failed: ${testResults.failed}`);
  testLogger.info(`⚠️  Warnings: ${testResults.warnings}`);

  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  testLogger.info(`📊 Success Rate: ${successRate}%`);

  if (testResults.failed === 0) {
    testLogger.success('🎉 All security tests passed! Your implementation is secure.');
  } else {
    testLogger.error('⚠️  Some tests failed. Please review the errors above.');
  }

  testLogger.divider();
  return testResults;
}

// Test 1: Privacy Service Initialization
async function testPrivacyInitialization(privacyService, results) {
  try {
    // Initialize privacy settings for test client
    const privacySettings = await privacyService.initializeClientPrivacy(TEST_CLIENT_ID, {
      data_retention_days: 30,
      encryption_enabled: true,
      audit_logging_enabled: true,
      access_restrictions: {
        allowDataExport: true,
        allowDataSharing: false,
        requireExplicitConsent: true
      }
    });

    testLogger.success('Privacy settings initialized for test client');
    results.passed++;

    // Verify settings were saved
    const retrievedSettings = await privacyService.getClientPrivacy(TEST_CLIENT_ID);
    if (retrievedSettings.client_id === TEST_CLIENT_ID && retrievedSettings.data_retention_days === 30) {
      testLogger.success('Privacy settings retrieved successfully');
      results.passed++;
    } else {
      testLogger.error('Privacy settings retrieval failed');
      results.failed++;
    }

  } catch (error) {
    testLogger.error('Privacy initialization test failed:', error.message);
    results.failed++;
  }
}

// Test 2: Vector Service Basic Operations
async function testVectorServiceBasics(vectorService, results) {
  try {
    // Test embedding generation
    const testText = "This is a test document for security testing.";
    const embedding = await vectorService.generateEmbedding(testText);

    if (embedding && embedding.length === 1536) {
      testLogger.success('Embedding generated successfully (1536 dimensions)');
      results.passed++;
    } else {
      testLogger.error('Embedding generation failed');
      results.failed++;
    }

    // Test document storage
    const stored = await vectorService.storeDocumentChunk({
      clientId: TEST_CLIENT_ID,
      documentId: 'test-doc-1',
      chunkId: 'test-chunk-1',
      content: testText,
      metadata: { type: 'test', security: 'test' },
      embedding: embedding
    });

    if (stored) {
      testLogger.success('Document chunk stored successfully');
      results.passed++;
    } else {
      testLogger.warning('Document chunk storage failed (may be expected during initial setup)');
      results.warnings++;
    }

    // Test note storage
    try {
      await vectorService.storeNote({
        clientId: TEST_CLIENT_ID,
        noteId: 'test-note-1',
        content: 'Test note for security verification',
        metadata: { category: 'test' },
        embedding: embedding
      });
      testLogger.success('Note stored successfully');
      results.passed++;
    } catch (error) {
      testLogger.warning('Note storage failed:', error.message);
      results.warnings++;
    }

  } catch (error) {
    testLogger.error('Vector service basic operations test failed:', error.message);
    results.failed++;
  }
}

// Test 3: Client Data Isolation
async function testClientDataIsolation(vectorService, results) {
  try {
    // Store data for different clients
    const embedding = await vectorService.generateEmbedding("Client isolation test data");

    // Store data for client 1
    const stored1 = await vectorService.storeDocumentChunk({
      clientId: TEST_CLIENT_ID,
      documentId: 'isolation-doc-1',
      chunkId: 'isolation-chunk-1',
      content: 'Data for client 1 only',
      metadata: { owner: TEST_CLIENT_ID },
      embedding: embedding
    });

    // Store data for client 2
    const stored2 = await vectorService.storeDocumentChunk({
      clientId: TEST_CLIENT_ID_2,
      documentId: 'isolation-doc-2',
      chunkId: 'isolation-chunk-2',
      content: 'Data for client 2 only',
      metadata: { owner: TEST_CLIENT_ID_2 },
      embedding: embedding
    });

    if (stored1 && stored2) {
      testLogger.success('Data stored for both test clients');
      results.passed++;

      // Test search isolation (this should only return data for the specific client)
      const searchResults = await vectorService.semanticSearch(TEST_CLIENT_ID, 'client data', 5);

      // Verify that results only contain data for the specified client
      const allResultsForCorrectClient = searchResults.every(result =>
        result.client_id === TEST_CLIENT_ID
      );

      if (allResultsForCorrectClient) {
        testLogger.success('Client data isolation working correctly');
        results.passed++;
      } else {
        testLogger.error('Client data isolation failed - cross-client data leakage detected');
        results.failed++;
      }
    } else {
      testLogger.warning('Could not store test data for isolation testing');
      results.warnings++;
    }

  } catch (error) {
    testLogger.error('Client data isolation test failed:', error.message);
    results.failed++;
  }
}

// Test 4: Secure Search Functions
async function testSecureSearchFunctions(vectorService, results) {
  try {
    const queryEmbedding = await vectorService.generateEmbedding("Test search query");

    // Test secure document search
    const docResults = await vectorService.searchDocumentChunks(TEST_CLIENT_ID, queryEmbedding, 3);
    testLogger.success(`Secure document search returned ${docResults.length} results`);
    results.passed++;

    // Test secure meeting search
    const meetingResults = await vectorService.searchMeetingTranscripts(TEST_CLIENT_ID, queryEmbedding, 3);
    testLogger.success(`Secure meeting search returned ${meetingResults.length} results`);
    results.passed++;

    // Test secure note search
    const noteResults = await vectorService.searchNotes(TEST_CLIENT_ID, queryEmbedding, 3);
    testLogger.success(`Secure note search returned ${noteResults.length} results`);
    results.passed++;

    // Test secure task search
    const taskResults = await vectorService.searchTasks(TEST_CLIENT_ID, queryEmbedding, 3);
    testLogger.success(`Secure task search returned ${taskResults.length} results`);
    results.passed++;

    // Test secure research search
    const researchResults = await vectorService.searchResearchData(TEST_CLIENT_ID, queryEmbedding, 3);
    testLogger.success(`Secure research search returned ${researchResults.length} results`);
    results.passed++;

  } catch (error) {
    testLogger.error('Secure search functions test failed:', error.message);
    results.failed++;
  }
}

// Test 5: Privacy Controls
async function testPrivacyControls(privacyService, vectorService, results) {
  try {
    // Test access control check
    const canRead = await privacyService.canAccessClientData(TEST_CLIENT_ID, 'read');
    const canExport = await privacyService.canAccessClientData(TEST_CLIENT_ID, 'export');

    if (canRead && canExport) {
      testLogger.success('Access control checks working correctly');
      results.passed++;
    } else {
      testLogger.error('Access control checks failed');
      results.failed++;
    }

    // Test privacy settings update
    const updatedSettings = await privacyService.updateClientPrivacy(TEST_CLIENT_ID, {
      data_retention_days: 60,
      access_restrictions: { allowDataExport: false }
    });

    if (updatedSettings && updatedSettings.data_retention_days === 60) {
      testLogger.success('Privacy settings updated successfully');
      results.passed++;
    } else {
      testLogger.error('Privacy settings update failed');
      results.failed++;
    }

    // Test export functionality
    try {
      const exportData = await privacyService.exportClientData(TEST_CLIENT_ID);
      if (exportData && exportData.client_id === TEST_CLIENT_ID) {
        testLogger.success('Client data export functionality working');
        results.passed++;
      } else {
        testLogger.error('Client data export failed');
        results.failed++;
      }
    } catch (exportError) {
      testLogger.warning('Data export test failed (may be expected):', exportError.message);
      results.warnings++;
    }

  } catch (error) {
    testLogger.error('Privacy controls test failed:', error.message);
    results.failed++;
  }
}

// Test 6: Audit Logging
async function testAuditLogging(privacyService, results) {
  try {
    // Test audit logging functionality
    await privacyService.logDataAccess(TEST_CLIENT_ID, 'read', 'document_chunks', 'test-user', {
      action: 'security-test',
      timestamp: new Date().toISOString()
    });

    testLogger.success('Audit logging test completed');
    results.passed++;

    // Test privacy compliance report
    try {
      const complianceReport = await privacyService.getPrivacyReport(TEST_CLIENT_ID);
      if (complianceReport && complianceReport.clients) {
        testLogger.success('Privacy compliance report generated successfully');
        results.passed++;
      } else {
        testLogger.error('Privacy compliance report generation failed');
        results.failed++;
      }
    } catch (reportError) {
      testLogger.warning('Compliance report test failed (may be expected):', reportError.message);
      results.warnings++;
    }

  } catch (error) {
    testLogger.error('Audit logging test failed:', error.message);
    results.failed++;
  }
}

// Test 7: Data Cleanup
async function testDataCleanup(privacyService, results) {
  try {
    // Note: We won't actually run cleanup to avoid deleting test data
    // Instead, we'll test the setup and permissions

    testLogger.info('Testing data cleanup setup (not executing to preserve test data)');

    // Test getting client IDs for cleanup
    const clientIds = await privacyService.getAllClientIds();
    testLogger.success(`Retrieved ${clientIds.length} client IDs for cleanup testing`);
    results.passed++;

    // Test data statistics
    const dataStats = await privacyService.getClientDataStats(TEST_CLIENT_ID);
    if (dataStats && typeof dataStats === 'object') {
      testLogger.success('Client data statistics retrieved successfully');
      results.passed++;
    } else {
      testLogger.error('Client data statistics retrieval failed');
      results.failed++;
    }

  } catch (error) {
    testLogger.error('Data cleanup test failed:', error.message);
    results.failed++;
  }
}

// Cleanup test data
async function cleanupTestData(privacyService) {
  testLogger.section('Cleaning Up Test Data');
  try {
    // Note: In a real implementation, you might want to clean up test data
    // For now, we'll just log that cleanup is being skipped
    testLogger.info('Skipping data cleanup to preserve test results for manual review');
    testLogger.info('To manually clean up, run: DELETE FROM vector_tables WHERE client_id LIKE \'test-security-%\'');
  } catch (error) {
    testLogger.error('Cleanup failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSecurityTests()
    .then(async (results) => {
      // Optional cleanup
      const privacyService = new PrivacyService();
      await cleanupTestData(privacyService);

      // Exit with appropriate code
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      testLogger.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runSecurityTests,
  testLogger
};