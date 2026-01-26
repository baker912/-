
-- Cleanup employee info for assets that are not in use
UPDATE assets
SET 
  employee_name = NULL,
  employee_code = NULL,
  department_name = NULL
WHERE status != 'in_use';
