const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

class VectorService {
  constructor() {
    // Initialize Supabase client for vector storage
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'placeholder-key'
    );

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Extract text from various file types
  async extractTextFromFile(filePath, mimeType) {
    try {
      const fileBuffer = await fs.readFile(filePath);

      switch (mimeType) {
        case 'application/pdf':
          try {
            const pdfData = await PDFParse(fileBuffer);
            return pdfData.text;
          } catch (pdfError) {
            console.error('PDF processing error:', pdfError);
            throw new Error(`Failed to process PDF file: ${pdfError.message}`);
          }

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
          return docxResult.value;

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
          let text = '';
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetText = xlsx.utils.sheet_to_txt(worksheet);
            text += `Sheet: ${sheetName}\n${sheetText}\n\n`;
          });
          return text;

        case 'text/plain':
          return fileBuffer.toString('utf-8');

        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  }

  // Generate embeddings from text
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, ' ').trim()
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Store document chunk with vector
  async storeDocumentChunk(data) {
    const {
      clientId,
      documentId,
      chunkId,
      content,
      metadata,
      embedding
    } = data;

    try {
      const { error } = await this.supabase
        .from('document_chunks')
        .insert({
          client_id: clientId,
          document_id: documentId,
          chunk_id: chunkId,
          content: content,
          metadata: metadata,
          embedding: embedding
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error storing document chunk:', error);
      // Don't throw error, just return false to indicate storage failed
      return false;
    }
  }

  // Store meeting transcript with vector
  async storeMeetingTranscript(data) {
    const {
      clientId,
      meetingId,
      content,
      metadata,
      embedding
    } = data;

    try {
      const { error } = await this.supabase
        .from('meeting_transcripts')
        .insert({
          client_id: clientId,
          meeting_id: meetingId,
          content: content,
          metadata: metadata,
          embedding: embedding
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing meeting transcript:', error);
      throw error;
    }
  }

  // Store note with vector
  async storeNote(data) {
    const {
      clientId,
      noteId,
      content,
      metadata,
      embedding
    } = data;

    try {
      const { error } = await this.supabase
        .from('vector_notes')
        .insert({
          client_id: clientId,
          note_id: noteId,
          content: content,
          metadata: metadata,
          embedding: embedding
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing note:', error);
      throw error;
    }
  }

  // Store task with vector
  async storeTask(data) {
    const {
      clientId,
      taskId,
      content,
      metadata,
      embedding
    } = data;

    try {
      const { error } = await this.supabase
        .from('vector_tasks')
        .insert({
          client_id: clientId,
          task_id: taskId,
          content: content,
          metadata: metadata,
          embedding: embedding
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing task:', error);
      throw error;
    }
  }

  // Store research data with vector
  async storeResearchData(data) {
    const {
      clientId,
      source,
      content,
      metadata,
      embedding
    } = data;

    try {
      const { error } = await this.supabase
        .from('research_data')
        .insert({
          client_id: clientId,
          source: source,
          content: content,
          metadata: metadata,
          embedding: embedding
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing research data:', error);
      throw error;
    }
  }

  // Semantic search across all content types
  async semanticSearch(clientId, query, limit = 10) {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search across all tables
      const searches = [
        this.searchDocumentChunks(clientId, queryEmbedding, limit),
        this.searchMeetingTranscripts(clientId, queryEmbedding, limit),
        this.searchNotes(clientId, queryEmbedding, limit),
        this.searchTasks(clientId, queryEmbedding, limit),
        this.searchResearchData(clientId, queryEmbedding, limit)
      ];

      const results = await Promise.all(searches);

      // Combine and rank results
      const allResults = results.flat().sort((a, b) => b.similarity - a.similarity);

      return allResults.slice(0, limit * 2); // Return more results for context
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  // Search document chunks
  async searchDocumentChunks(clientId, queryEmbedding, limit) {
    try {
      const { data, error } = await this.supabase
        .rpc('search_document_chunks', {
          query_client_id: clientId,
          query_embedding: queryEmbedding,
          match_count: limit
        });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        type: 'document',
        source: item.metadata?.documentName || 'Document'
      }));
    } catch (error) {
      console.error('Error searching document chunks:', error);
      return [];
    }
  }

  // Search meeting transcripts
  async searchMeetingTranscripts(clientId, queryEmbedding, limit) {
    try {
      const { data, error } = await this.supabase
        .rpc('search_meeting_transcripts', {
          query_client_id: clientId,
          query_embedding: queryEmbedding,
          match_count: limit
        });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        type: 'meeting',
        source: item.metadata?.meetingTitle || 'Meeting'
      }));
    } catch (error) {
      console.error('Error searching meeting transcripts:', error);
      return [];
    }
  }

  // Search notes
  async searchNotes(clientId, queryEmbedding, limit) {
    try {
      const { data, error } = await this.supabase
        .rpc('search_notes', {
          query_client_id: clientId,
          query_embedding: queryEmbedding,
          match_count: limit
        });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        type: 'note',
        source: item.metadata?.noteType || 'Note'
      }));
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  // Search tasks
  async searchTasks(clientId, queryEmbedding, limit) {
    try {
      const { data, error } = await this.supabase
        .rpc('search_tasks', {
          query_client_id: clientId,
          query_embedding: queryEmbedding,
          match_count: limit
        });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        type: 'task',
        source: item.metadata?.taskTitle || 'Task'
      }));
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }

  // Search research data
  async searchResearchData(clientId, queryEmbedding, limit) {
    try {
      const { data, error } = await this.supabase
        .rpc('search_research_data', {
          query_client_id: clientId,
          query_embedding: queryEmbedding,
          match_count: limit
        });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        type: 'research',
        source: item.metadata?.sourceName || 'Research'
      }));
    } catch (error) {
      console.error('Error searching research data:', error);
      return [];
    }
  }

  // Chunk text for processing
  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      if (end >= text.length) {
        chunks.push(text.substring(start));
        break;
      }

      // Try to break at sentence boundary
      const lastSentenceEnd = text.lastIndexOf('.', end);
      if (lastSentenceEnd > start && lastSentenceEnd < end + 100) {
        end = lastSentenceEnd + 1;
      } else {
        // Break at word boundary
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter(chunk => chunk.length > 50);
  }

  // Process and store entire document
  async processDocument(clientId, documentId, filePath, mimeType, metadata) {
    try {
      // Extract text from file
      const text = await this.extractTextFromFile(filePath, mimeType);

      // Chunk the text
      const chunks = this.chunkText(text);

      // Process each chunk
      let successfulChunks = 0;
      let failedChunks = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);

        const stored = await this.storeDocumentChunk({
          clientId,
          documentId,
          chunkId: `${documentId}_chunk_${i}`,
          content: chunk,
          metadata: {
            ...metadata,
            chunkIndex: i,
            totalChunks: chunks.length,
            documentName: metadata.filename || 'Unknown Document'
          },
          embedding
        });

        if (stored) {
          successfulChunks++;
        } else {
          failedChunks++;
        }
      }

      console.log(`Document processing complete: ${successfulChunks} chunks stored successfully, ${failedChunks} chunks failed`);

      if (failedChunks > 0) {
        console.warn(`Vector storage partially failed for document ${documentId}: ${failedChunks}/${chunks.length} chunks could not be stored`);
      }

      return { chunksProcessed: chunks.length };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
}

module.exports = VectorService;