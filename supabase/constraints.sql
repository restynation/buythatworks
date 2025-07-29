-- Add unique constraint to ensure only one computer per setup
-- This should be run AFTER inserting the seed data
CREATE UNIQUE INDEX idx_one_computer_per_setup 
ON setup_blocks (setup_id) 
WHERE device_type_id = 1; -- computer device type ID is 1 