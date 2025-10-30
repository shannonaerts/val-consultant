-- SIMPLE FIX: Add missing accessRestrictions column
-- Run this in Supabase SQL Editor

-- Add the missing column to client_privacy_settings table
ALTER TABLE client_privacy_settings
ADD COLUMN IF NOT EXISTS access_restrictions JSONB DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'client_privacy_settings'
AND table_schema = 'public'
AND column_name = 'access_restrictions';