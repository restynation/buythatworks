-- Remove handle columns from setup_edges table
-- This migration removes source_handle and target_handle columns since handles are calculated automatically

-- Drop check constraints first
ALTER TABLE setup_edges 
DROP CONSTRAINT IF EXISTS chk_source_handle;

ALTER TABLE setup_edges 
DROP CONSTRAINT IF EXISTS chk_target_handle;

-- Drop indexes on handle columns
DROP INDEX IF EXISTS idx_setup_edges_source_handle;
DROP INDEX IF EXISTS idx_setup_edges_target_handle;

-- Remove handle columns
ALTER TABLE setup_edges 
DROP COLUMN IF EXISTS source_handle;

ALTER TABLE setup_edges 
DROP COLUMN IF EXISTS target_handle; 