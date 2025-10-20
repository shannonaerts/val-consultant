-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting transcripts table
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table (vector version)
CREATE TABLE IF NOT EXISTS vector_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (vector version)
CREATE TABLE IF NOT EXISTS vector_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research data table
CREATE TABLE IF NOT EXISTS research_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_client_id ON document_chunks(client_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_client_id ON meeting_transcripts(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_id ON meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_vector_notes_client_id ON vector_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_vector_notes_note_id ON vector_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_vector_tasks_client_id ON vector_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_vector_tasks_task_id ON vector_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_research_data_client_id ON research_data(client_id);
CREATE INDEX IF NOT EXISTS idx_research_data_source ON research_data(source);

-- Create vector indexes for similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_embedding ON meeting_transcripts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vector_notes_embedding ON vector_notes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vector_tasks_embedding ON vector_tasks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_research_data_embedding ON research_data USING ivfflat (embedding vector_cosine_ops);

-- Function to search document chunks
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_client_id TEXT,
  query_embedding vector(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  client_id TEXT,
  document_id TEXT,
  chunk_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.client_id,
    dc.document_id,
    dc.chunk_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE dc.client_id = query_client_id
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search meeting transcripts
CREATE OR REPLACE FUNCTION search_meeting_transcripts(
  query_client_id TEXT,
  query_embedding vector(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  client_id TEXT,
  meeting_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.id,
    mt.client_id,
    mt.meeting_id,
    mt.content,
    mt.metadata,
    1 - (mt.embedding <=> query_embedding) as similarity
  FROM meeting_transcripts mt
  WHERE mt.client_id = query_client_id
  ORDER BY mt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search notes
CREATE OR REPLACE FUNCTION search_notes(
  query_client_id TEXT,
  query_embedding vector(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  client_id TEXT,
  note_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vn.id,
    vn.client_id,
    vn.note_id,
    vn.content,
    vn.metadata,
    1 - (vn.embedding <=> query_embedding) as similarity
  FROM vector_notes vn
  WHERE vn.client_id = query_client_id
  ORDER BY vn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search tasks
CREATE OR REPLACE FUNCTION search_tasks(
  query_client_id TEXT,
  query_embedding vector(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  client_id TEXT,
  task_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vt.id,
    vt.client_id,
    vt.task_id,
    vt.content,
    vt.metadata,
    1 - (vt.embedding <=> query_embedding) as similarity
  FROM vector_tasks vt
  WHERE vt.client_id = query_client_id
  ORDER BY vt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search research data
CREATE OR REPLACE FUNCTION search_research_data(
  query_client_id TEXT,
  query_embedding vector(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  client_id TEXT,
  source TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.id,
    rd.client_id,
    rd.source,
    rd.content,
    rd.metadata,
    1 - (rd.embedding <=> query_embedding) as similarity
  FROM research_data rd
  WHERE rd.client_id = query_client_id
  ORDER BY rd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_document_chunks_updated_at BEFORE UPDATE ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_transcripts_updated_at BEFORE UPDATE ON meeting_transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_notes_updated_at BEFORE UPDATE ON vector_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_tasks_updated_at BEFORE UPDATE ON vector_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_data_updated_at BEFORE UPDATE ON research_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();