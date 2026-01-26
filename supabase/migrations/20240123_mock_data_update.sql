
DO $$
DECLARE
    contract_rec RECORD;
    supplier_names TEXT[] := ARRAY['TechCorp', 'BuildIt', 'SupplyChain Inc', 'Global Trade', 'Local Services', 'Future Systems', 'Mega Parts', 'Quick Fix', 'Smart Solutions', 'Green Energy'];
    project_prefixes TEXT[] := ARRAY['Server Upgrade', 'Network Expansion', 'Office Renovation', 'Laptop Procurement', 'Software License', 'Cloud Migration', 'Security Audit', 'Data Center Cooling', 'Furniture Supply', 'Cabling Project'];
    random_supplier_idx INT;
    random_project_idx INT;
    new_project_name TEXT;
    new_bm_number TEXT;
    new_po_number TEXT;
    new_project_time TEXT;
    supplier_count INT;
    i INT;
    j INT;
BEGIN
    -- 1. Update existing procurement_contracts with realistic data
    FOR contract_rec IN SELECT id FROM public.procurement_contracts LOOP
        -- Generate random data
        random_project_idx := floor(random() * array_length(project_prefixes, 1) + 1);
        new_project_name := project_prefixes[random_project_idx] || ' ' || floor(random() * 1000)::text;
        new_bm_number := 'BM' || lpad(floor(random() * 100000)::text, 6, '0');
        new_po_number := 'PO' || lpad(floor(random() * 100000)::text, 6, '0');
        new_project_time := (2023 + floor(random() * 2))::text || '-Q' || floor(random() * 4 + 1)::text;

        -- Update the contract
        UPDATE public.procurement_contracts
        SET 
            project_name = new_project_name,
            bm_number = new_bm_number,
            procurement_order = new_po_number,
            project_time = new_project_time,
            description = 'Auto-generated description for ' || new_project_name,
            technical_spec = '[]'::jsonb, -- Empty for now, or could mock some urls
            other_attachments = '[]'::jsonb
        WHERE id = contract_rec.id;

        -- 2. Generate 1-3 suppliers for this contract
        -- First, delete existing suppliers for this contract (to be safe if re-running)
        DELETE FROM public.contract_suppliers WHERE contract_id = contract_rec.id;

        supplier_count := floor(random() * 3 + 1); -- 1 to 3 suppliers

        FOR j IN 1..supplier_count LOOP
            random_supplier_idx := floor(random() * array_length(supplier_names, 1) + 1);
            
            INSERT INTO public.contract_suppliers (
                contract_id,
                supplier_name,
                contact_person,
                contact_phone,
                contract_files,
                order_files,
                payment_files,
                acceptance_files
            ) VALUES (
                contract_rec.id,
                supplier_names[random_supplier_idx] || ' ' || floor(random() * 100)::text,
                'Contact ' || chr(65 + floor(random() * 26)::int), -- Random Name like "Contact A"
                '138' || lpad(floor(random() * 100000000)::text, 8, '0'), -- Random Phone
                '[]'::jsonb,
                '[]'::jsonb,
                '[]'::jsonb,
                '[]'::jsonb
            );
        END LOOP;
        
    END LOOP;
END $$;
