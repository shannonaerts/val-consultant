# Vector Database Implementation for VAL System

This document describes the vector database implementation that enables powerful semantic search capabilities across all client data in the VAL (Virtual AI Consultant) system.

## Overview

The vector database system allows VAL to:
- Extract text from uploaded documents (PDF, DOCX, XLSX, TXT)
- Generate vector embeddings for all content types
- Perform semantic search across meetings, notes, tasks, documents, and research data
- Provide intelligent responses in chat based on relevant content

## Architecture

### Components

1. **Vector Service** (`services/vectorService.js`)
   - Handles text extraction from documents
   - Generates embeddings using OpenAI's API
   - Manages vector storage operations
   - Performs semantic search across all content types

2. **Database Schema** (`schema/vector_schema.sql`)
   - PostgreSQL with pgvector extension
   - Separate tables for each content type
   - Optimized indexes for similarity search
   - Search functions for each content type

3. **Integration Points**
   - Document upload endpoint processes files for vector storage
   - Notes creation endpoint stores notes in vector format
   - Chat endpoint uses semantic search for intelligent responses
   - Migration endpoint processes existing data

## Supported File Types

- **PDF**: Extracts text from PDF documents
- **DOCX**: Processes Microsoft Word documents
- **XLSX**: Extracts text from Excel spreadsheets
- **TXT**: Handles plain text files

## Vector Storage Tables

### Document Chunks
- Stores processed document content in searchable chunks
- Maintains metadata about source document
- Enables efficient document retrieval

### Meeting Transcripts
- Stores meeting transcript content
- Includes meeting metadata (title, date, participants)
- Enables meeting-specific queries

### Notes
- Stores user-created notes
- Includes creator and timestamp information
- Enables note search and retrieval

### Tasks
- Stores task information and descriptions
- Includes status, priority, and assignee data
- Enables task-related queries

### Research Data
- Stores scraped research information
- Includes source and metadata
- Enables research-based queries

## Setup Instructions

### 1. Database Setup

Create a PostgreSQL database with pgvector extension:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run the schema setup
\i schema/vector_schema.sql
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# OpenAI API for embeddings
OPENAI_API_KEY=your_openai_api_key_here

# Supabase or PostgreSQL connection
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Install Dependencies

```bash
npm install pdf-parse mammoth xlsx @supabase/supabase-js openai
```

### 4. Migrate Existing Data

Use the migration endpoint to process existing data:

```bash
POST /api/migrate-to-vector/:clientId
```

## Usage Examples

### Document Upload with Vector Processing

```javascript
// Upload endpoint automatically processes documents
const formData = new FormData();
formData.append('document', file);
formData.append('clientId', 'client-id');
formData.append('title', 'Document Title');

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
});
```

### Semantic Search in Chat

```javascript
// Chat endpoint uses vector search automatically
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client-id',
    message: 'What were the main points from our last meeting?'
  })
});
```

### Manual Vector Search

```javascript
const vectorService = new VectorService();
const results = await vectorService.semanticSearch(
  'client-id',
  'project timeline',
  5 // limit
);
```

## Search Capabilities

The vector system enables natural language queries across all content:

- **Meeting queries**: "What did we discuss about the budget?"
- **Task queries**: "What tasks are pending for the Q1 deliverable?"
- **Document queries**: "Find information about technical requirements"
- **Note queries**: "What were the key decisions made?"
- **Research queries**: "What do we know about their competition?"

## Text Processing

### Document Chunking

- Documents are automatically chunked into ~1000 character pieces
- 200 character overlap ensures context continuity
- Chunks are optimized for sentence boundaries when possible

### Embedding Generation

- Uses OpenAI's text-embedding-ada-002 model
- Generates 1536-dimensional vectors
- Handles text preprocessing and cleaning

### Similarity Search

- Uses cosine similarity for vector comparison
- Returns results with similarity scores
- Ranks results by relevance

## Performance Considerations

### Indexing

- IVFFlat indexes for efficient similarity search
- Client-based partitioning for multi-tenant isolation
- Optimized for read-heavy workloads

### Scaling

- Horizontal scaling through read replicas
- Connection pooling for database efficiency
- Background processing for document uploads

## Monitoring and Debugging

### Logging

The system provides detailed logging for:
- Document processing status
- Vector embedding generation
- Search query performance
- Migration progress

### Error Handling

- Graceful fallback when vector processing fails
- Retry logic for API rate limits
- Error reporting without breaking uploads

## Security

### Data Isolation

- Client-based data separation
- Secure API key handling
- File path validation

### Access Control

- Client-specific search scopes
- API token validation
- File upload restrictions

## Future Enhancements

### Planned Features

- Support for more file types (PPT, images with OCR)
- Advanced query understanding
- Real-time content indexing
- Search result ranking improvements

### Performance Optimizations

- Caching for frequent queries
- Batch processing for embeddings
- Database query optimization
- Vector compression techniques

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**
   - Ensure OPENAI_API_KEY is set in environment

2. **Database Connection Issues**
   - Verify Supabase/PostgreSQL connection details
   - Check pgvector extension installation

3. **File Processing Failures**
   - Check file format support
   - Verify file permissions and paths

4. **Search Not Working**
   - Ensure data has been migrated to vector storage
   - Check search logs for errors

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=vector:*
```

## API Reference

### Vector Service Methods

- `extractTextFromFile(filePath, mimeType)` - Extract text from files
- `generateEmbedding(text)` - Generate vector embeddings
- `semanticSearch(clientId, query, limit)` - Perform semantic search
- `processDocument(clientId, documentId, filePath, mimeType, metadata)` - Process documents

### Endpoints

- `POST /api/documents/upload` - Upload and process documents
- `POST /api/notes` - Create notes with vector storage
- `POST /api/chat` - Chat with semantic search
- `POST /api/migrate-to-vector/:clientId` - Migrate existing data

## Support

For questions or issues with the vector database implementation:

1. Check the logs for detailed error messages
2. Verify environment configuration
3. Test with a small dataset first
4. Review the troubleshooting section above