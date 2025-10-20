# Local PostgreSQL Setup with pgvector

## Option 1: Docker (Recommended)

### 1. Run pgvector Docker Container
```bash
# Run pgvector with PostgreSQL 15
docker run --name val-postgres \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=val_vector_db \
  -p 5432:5432 \
  -d pgvector/pgvector:pg15
```

### 2. Install PostgreSQL Client Tools
```bash
# macOS
brew install postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Or use Docker exec
docker exec -it val-postgres psql -U postgres -d val_vector_db
```

### 3. Connect and Setup Database
```bash
# Connect to database
psql -h localhost -U postgres -d val_vector_db

# Or if using Docker exec:
docker exec -it val-postgres psql -U postgres -d val_vector_db
```

### 4. Create Vector Extension and Tables
In psql, run:
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Test the extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Exit psql
\q
```

### 5. Run Schema Setup
```bash
# Run the schema file
psql -h localhost -U postgres -d val_vector_db -f schema/vector_schema.sql

# Or with Docker:
docker exec -i val-postgres psql -U postgres -d val_vector_db < schema/vector_schema.sql
```

## Option 2: Local Installation

### 1. Install PostgreSQL
```bash
# macOS with Homebrew
brew install postgresql@15 pgvector

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib-15

# Then install pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
sudo -u postgres psql -c "CREATE EXTENSION vector;"
```

### 2. Start PostgreSQL
```bash
# macOS with Homebrew
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### 3. Create Database
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE val_vector_db;
CREATE USER val_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE val_vector_db TO val_user;
\q
```

### 4. Setup Vector Extension
```bash
psql -h localhost -U val_user -d val_vector_db
```

```sql
CREATE EXTENSION IF NOT EXISTS vector;
\i schema/vector_schema.sql
\q
```

## Update Environment Variables

Add to your `.env` file:

```bash
# For direct PostgreSQL connection
DATABASE_URL=postgresql://val_user:password123@localhost:5432/val_vector_db

# Or if using Docker default:
DATABASE_URL=postgresql://postgres:password123@localhost:5432/val_vector_db

# OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

## Test Connection

Create a simple test script to verify the setup:

```javascript
// test-vector.js
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Test vector extension
    const result = await client.query('SELECT * FROM pg_extension WHERE extname = $1', ['vector']);
    if (result.rows.length > 0) {
      console.log('✅ pgvector extension is installed');
    } else {
      console.log('❌ pgvector extension not found');
    }

    // Test vector operations
    await client.query('SELECT $1 <=> $2', [
      '[1,2,3]',
      '[1,2,3]'
    ]);
    console.log('✅ Vector operations working');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
```

Run the test:
```bash
cd /Users/shannonaerts/val-consultant/backend/node-services
node test-vector.js
```

## Common Issues

### Port Already in Use
```bash
# Kill existing PostgreSQL on port 5432
sudo lsof -i :5432
sudo kill -9 <PID>

# Or use different port
docker run --name val-postgres -p 5433:5432 ...
```

### Permission Denied
```bash
# Fix permissions
sudo chown -R $USER:$(id -gn $USER) ~/.pgpass
chmod 600 ~/.pgpass
```

### Docker Connection Issues
```bash
# Check if container is running
docker ps

# Check logs
docker logs val-postgres

# Restart container
docker restart val-postgres
```

## Update Vector Service for Direct PostgreSQL

If you choose not to use Supabase, update `services/vectorService.js`:

```javascript
// Replace Supabase client with PostgreSQL
const { Client } = require('pg');

class VectorService {
  constructor() {
    this.pgClient = new Client({
      connectionString: process.env.DATABASE_URL
    });
    this.pgClient.connect();
  }

  async storeDocumentChunk(data) {
    const sql = `
      INSERT INTO document_chunks
      (client_id, document_id, chunk_id, content, metadata, embedding)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.pgClient.query(sql, [
      data.clientId, data.documentId, data.chunkId,
      data.content, JSON.stringify(data.metadata), data.embedding
    ]);
  }

  // ... update other methods similarly
}
```