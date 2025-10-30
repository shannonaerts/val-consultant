-- FIX PRIVACY TABLE STRUCTURE
-- This script adds the missing accessRestrictions column
-- Run this in Supabase SQL Editor

-- Check if the accessRestrictions column exists, and add it if it doesn't
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_privacy_settings'
        AND column_name = 'access_restrictions'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE client_privacy_settings
        ADD COLUMN access_restrictions JSONB DEFAULT '{}';

        RAISE NOTICE 'Added access_restrictions column to client_privacy_settings';
    ELSE
        RAISE NOTICE 'access_restrictions column already exists';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'client_privacy_settings'
AND table_schema = 'public'
ORDER BY ordinal_position;