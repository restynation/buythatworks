-- Add handle columns to setup_edges table
-- This migration adds source_handle and target_handle columns to store
-- the specific handles (left, right, top, bottom) used for connections

-- Add source_handle column
ALTER TABLE setup_edges 
ADD COLUMN source_handle VARCHAR(20);

-- Add target_handle column  
ALTER TABLE setup_edges 
ADD COLUMN target_handle VARCHAR(20);

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN setup_edges.source_handle IS 'The handle position (left, right, top, bottom) on the source block';
COMMENT ON COLUMN setup_edges.target_handle IS 'The handle position (left-target, right-target, top-target, bottom-target) on the target block';

-- Create indexes for performance on handle columns
CREATE INDEX idx_setup_edges_source_handle ON setup_edges(source_handle);
CREATE INDEX idx_setup_edges_target_handle ON setup_edges(target_handle);

-- Add check constraints to ensure valid handle values
ALTER TABLE setup_edges 
ADD CONSTRAINT chk_source_handle 
CHECK (source_handle IN ('left', 'right', 'top', 'bottom'));

ALTER TABLE setup_edges 
ADD CONSTRAINT chk_target_handle 
CHECK (target_handle IN ('left-target', 'right-target', 'top-target', 'bottom-target')); 