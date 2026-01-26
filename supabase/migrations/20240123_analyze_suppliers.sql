
-- Check for duplicates (same supplier for same contract)
SELECT contract_id, supplier_name, COUNT(*)
FROM contract_suppliers
GROUP BY contract_id, supplier_name
HAVING COUNT(*) > 1;

-- Check distribution of suppliers across contracts
SELECT supplier_name, COUNT(DISTINCT contract_id) as project_count
FROM contract_suppliers
GROUP BY supplier_name
ORDER BY project_count DESC
LIMIT 10;
