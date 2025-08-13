-- Check all port types in the database
-- This script shows all port types and their IDs in the current database

-- Show all port types with their IDs
SELECT 
  id,
  code,
  created_at
FROM port_types 
ORDER BY id;

-- Count total port types
SELECT COUNT(*) as total_port_types FROM port_types;

-- Show port types grouped by creation date
SELECT 
  DATE(created_at) as created_date,
  COUNT(*) as count,
  STRING_AGG(code, ', ' ORDER BY code) as port_types
FROM port_types 
GROUP BY DATE(created_at)
ORDER BY created_date;

-- Check for any duplicate codes
SELECT 
  code,
  COUNT(*) as count,
  ARRAY_AGG(id ORDER BY id) as ids
FROM port_types 
GROUP BY code
HAVING COUNT(*) > 1;

-- Show the most recent port types
SELECT 
  id,
  code,
  created_at
FROM port_types 
ORDER BY created_at DESC
LIMIT 10; 