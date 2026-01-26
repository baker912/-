
-- Cleanup department_id for assets that are not in use
UPDATE assets
SET 
  department_id = NULL
WHERE status != 'in_use';
