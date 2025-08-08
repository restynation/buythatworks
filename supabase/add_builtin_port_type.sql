-- Add 'built-in' port type to the database
-- This script adds the new 'built-in' port type to the port_types table

-- Add the new port type only if it doesn't exist
INSERT INTO port_types (code) VALUES ('built-in')
ON CONFLICT (code) DO NOTHING;

-- Verify the insertion
SELECT * FROM port_types WHERE code = 'built-in';

-- Show all current port types for verification
SELECT * FROM port_types ORDER BY code; 