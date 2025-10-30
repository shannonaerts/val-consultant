# Security Testing Guide for VAL Vector Service

This guide provides step-by-step instructions for testing the security implementation of your VAL vector service.

## 🚀 Quick Start

### 1. Run the Security Test Script

```bash
# Navigate to the orchestrator directory
cd backend/node-services/orchestrator

# Make sure you have your environment variables set
# Your .env file should include:
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# OPENAI_API_KEY=your_openai_key

# Run the comprehensive security test
node test_security.js
```

### 2. Expected Test Results

The test script will run 7 comprehensive test suites:
- ✅ **Privacy Service Initialization**
- ✅ **Vector Service Basic Operations**
- ✅ **Client Data Isolation**
- ✅ **Secure Search Functions**
- ✅ **Privacy Controls**
- ✅ **Audit Logging**
- ✅ **Data Cleanup**

**Success Criteria:**
- All tests should pass (✅)
- You may see some warnings (⚠️) which are normal during initial setup
- No errors (❌) should occur

## 🔧 Pre-Testing Checklist

### Before Running Tests:

1. **✅ Execute SQL Security Script**
   ```sql
   -- Run this in your Supabase SQL Editor first!
   -- Copy contents from: schema/fix_rls_security.sql
   ```

2. **✅ Update Environment Variables**
   ```bash
   # Make sure your .env file includes:
   SUPABASE_URL=https://yudmkaiigwrdqvgrcege.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```

3. **✅ Install Dependencies**
   ```bash
   npm install @supabase/supabase-js openai
   ```

## 📊 Understanding Test Results

### Success Indicators:
```
✅ SUCCESS: Privacy settings initialized for test client
✅ SUCCESS: Embedding generated successfully (1536 dimensions)
✅ SUCCESS: Client data isolation working correctly
```

### Expected Warnings:
```
⚠️  WARNING: Document chunk storage failed (may be expected during initial setup)
⚠️  WARNING: Data export test failed (may be expected)
```

### Error Indicators:
```
❌ ERROR: Client data isolation failed - cross-client data leakage detected
❌ ERROR: Access control checks failed
```

## 🔍 Manual Testing Steps

### Test 1: Verify RLS is Enabled

```sql
-- Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('document_chunks', 'meeting_transcripts', 'vector_notes', 'vector_tasks', 'research_data');
```

**Expected:** All tables should show `rowsecurity = true`

### Test 2: Verify Secure Functions Exist

```sql
-- Check if secure search functions exist
SELECT proname
FROM pg_proc
WHERE proname LIKE 'secure_search_%';
```

**Expected:** Should return 5 functions:
- `secure_search_document_chunks`
- `secure_search_meeting_transcripts`
- `secure_search_notes`
- `secure_search_tasks`
- `secure_search_research_data`

### Test 3: Test Client Isolation Manually

```sql
-- Test that you can only see data for your client
SELECT * FROM document_chunks WHERE client_id = 'test-client-id';

-- Try to access another client's data (should return empty)
SELECT * FROM document_chunks WHERE client_id = 'other-client-id';
```

## 🛠️ Troubleshooting Common Issues

### Issue: "RLS Disabled" Errors
**Solution:**
```sql
-- Enable RLS manually
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
-- Repeat for all vector tables
```

### Issue: "Function not found" Errors
**Solution:**
```sql
-- Re-run the security script
-- Make sure you're using the complete script from schema/fix_rls_security.sql
```

### Issue: "Permission denied" Errors
**Solutions:**
1. Check your `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Verify you're not using the anon key for backend operations
3. Ensure the user has proper permissions

### Issue: OpenAI API Errors
**Solutions:**
1. Verify your `OPENAI_API_KEY` is valid and has credits
2. Check network connectivity
3. Ensure OpenAI API is accessible from your environment

## 🔐 Security Validation Tests

### Test Client Data Isolation

```javascript
// Test code to verify client isolation
const vectorService = new VectorService();

// Store data for client A
await vectorService.storeDocumentChunk({
  clientId: 'client-A',
  documentId: 'doc-1',
  chunkId: 'chunk-1',
  content: 'Sensitive data for client A',
  embedding: embedding
});

// Store data for client B
await vectorService.storeDocumentChunk({
  clientId: 'client-B',
  documentId: 'doc-1',
  chunkId: 'chunk-1',
  content: 'Sensitive data for client B',
  embedding: embedding
});

// Search client A's data - should NOT return client B's data
const resultsA = await vectorService.semanticSearch('client-A', 'sensitive data');

// Verify no cross-client data leakage
const hasCrossClientData = resultsA.some(result => result.client_id !== 'client-A');
console.log('Cross-client leakage detected:', hasCrossClientData); // Should be false
```

### Test Access Control

```javascript
// Test privacy controls
const privacyService = new PrivacyService();

// Disable export for a client
await privacyService.updateClientPrivacy('client-A', {
  accessRestrictions: { allowDataExport: false }
});

// Try to export - should fail
try {
  await privacyService.exportClientData('client-A');
  console.log('Export allowed when it should be denied');
} catch (error) {
  console.log('Export correctly blocked:', error.message);
}
```

## 📈 Performance Testing

### Test Search Performance

```javascript
// Test search performance with different data sizes
const testSearch = async (clientId, query) => {
  const startTime = Date.now();
  const results = await vectorService.semanticSearch(clientId, query, 10);
  const endTime = Date.now();

  console.log(`Search returned ${results.length} results in ${endTime - startTime}ms`);
  return { results, time: endTime - startTime };
};
```

## 🎯 Advanced Testing Scenarios

### 1. Stress Testing
- Test with multiple concurrent clients
- Test with large document uploads
- Test search performance under load

### 2. Edge Cases
- Test with empty embeddings
- Test with very long documents
- Test with special characters in content

### 3. Security Edge Cases
- Test SQL injection attempts
- Test unauthorized access attempts
- Test malformed data inputs

## 📝 Test Report Template

```
VAL Vector Service Security Test Report
========================================

Test Date: [Date]
Test Environment: [Development/Staging/Production]
Tester: [Name]

Environment Variables:
- SUPABASE_URL: ✅ Configured
- SUPABASE_SERVICE_ROLE_KEY: ✅ Configured
- OPENAI_API_KEY: ✅ Configured

Test Results:
- Privacy Service Initialization: ✅ PASSED
- Vector Service Basic Operations: ✅ PASSED
- Client Data Isolation: ✅ PASSED
- Secure Search Functions: ✅ PASSED
- Privacy Controls: ✅ PASSED
- Audit Logging: ✅ PASSED
- Data Cleanup: ✅ PASSED

Overall Status: ✅ ALL TESTS PASSED

Notes:
- No security vulnerabilities detected
- Client data isolation working correctly
- All privacy controls functioning as expected
- Audit logging successfully captures access events

Recommendations:
- Continue monitoring RLS policies
- Regular security testing recommended
- Consider implementing automated security scans
```

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] All security tests pass in staging environment
- [ ] RLS policies are enabled and working
- [ ] Service role keys are secured
- [ ] Audit logging is enabled
- [ ] Data retention policies are configured
- [ ] Monitoring and alerting are set up
- [ ] Backup procedures are tested
- [ ] Security review completed

---

**If you encounter any issues during testing, please review the troubleshooting section or check the error messages in the test output.**