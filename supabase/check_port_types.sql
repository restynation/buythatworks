-- Check current port_types table state
-- This script shows all port types and their IDs in the database

SELECT 
  id,
  code,
  created_at
FROM port_types 
ORDER BY id;

-- Count total port types
SELECT COUNT(*) as total_port_types FROM port_types;

-- Check if 'built-in' exists and its ID
SELECT 
  id,
  code,
  created_at
FROM port_types 
WHERE code = 'built-in'; 