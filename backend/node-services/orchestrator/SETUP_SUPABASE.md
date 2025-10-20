# Supabase Setup Guide for VAL Vector Database

## Quick Setup (5 minutes)

### 1. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → "Sign up with GitHub"

### 2. Create New Project
1. Click **New Project**
2. Select your organization (or create one)
3. Project Settings:
   - **Project Name**: `val-vector-db`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **Create new project**
5. Wait for project to be ready (2-3 minutes)

### 3. Enable Vector Extension
1. Go to **SQL Editor** in left sidebar
2. Click **New query**
3. Paste and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
4. Click **Run** (should show "Success" immediately)

### 4. Create Vector Tables
1. In the same SQL Editor, paste the entire contents of `schema/vector_schema.sql`
2. Click **Run**
3. You should see multiple "CREATE TABLE" and "CREATE FUNCTION" successes

### 5. Get Connection Details
1. Go to **Settings** → **API** in left sidebar
2. Copy the **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
3. Copy the **anon public** key (long string starting with `eyJ...`)

### 6. Update Environment Variables
Edit your `.env` file:
```bash
# Replace with your actual values
OPENAI_API_KEY=sk-your-actual-openai-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJ-your-actual-anon-key-here
```

### 7. Test Connection
Restart your server and test vector functionality:
```bash
cd /Users/shannonaerts/val-consultant/backend/node-services
node orchestrator/index.js
```

## Troubleshooting

### Extension Not Found
If you get "extension not found" error:
1. Go back to SQL Editor
2. Run: `DROP EXTENSION IF EXISTS vector; CREATE EXTENSION vector;`
3. Try again

### Connection Failed
1. Double-check your Project URL and anon key
2. Make sure there's no trailing slash in the URL
3. Verify you copied the entire anon key

### Permission Denied
1. Go to Settings → API
2. Ensure you're using the "anon public" key, not "service_role"
3. Check that your project is active (not paused)

## Advanced: Direct PostgreSQL Connection

If you want to connect directly instead of using Supabase client:
1. Go to Settings → Database
2. Copy the **Connection string**
3. Add to `.env`:
```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

Then modify the vector service to use `pg` instead of Supabase client.