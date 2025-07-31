-- Set default handle values for existing edges
-- This migration sets default handle values for existing edges that don't have handle information

-- Update existing edges to have default handle values
-- This is a fallback for edges created before handle columns were added
UPDATE setup_edges 
SET 
  source_handle = 'left',
  target_handle = 'left-target'
WHERE source_handle IS NULL OR target_handle IS NULL;

-- Add NOT NULL constraints after setting default values
-- This ensures all future edges must have handle information
ALTER TABLE setup_edges 
ALTER COLUMN source_handle SET NOT NULL;

ALTER TABLE setup_edges 
ALTER COLUMN target_handle SET NOT NULL; 