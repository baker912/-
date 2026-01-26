
DO $$
DECLARE
    asset_rec RECORD;
    contract_rec RECORD;
    random_contract_id UUID;
    equipment_types TEXT[] := ARRAY['Laptop', 'Desktop', 'Server', 'Monitor', 'Printer', 'Scanner', 'Projector', 'Router', 'Switch', 'Firewall'];
    brands TEXT[] := ARRAY['Dell', 'HP', 'Lenovo', 'Apple', 'Cisco', 'Huawei', 'Samsung', 'LG', 'Canon', 'Epson'];
    models TEXT[] := ARRAY['X1 Carbon', 'Latitude 7420', 'MacBook Pro', 'ThinkCentre', 'ProLiant DL380', 'Catalyst 9300', 'Galaxy Tab', 'UltraSharp U2720Q', 'LaserJet Pro', 'Pixma'];
    units TEXT[] := ARRAY['台', '套', '个', '组', '件'];
    random_type_idx INT;
    random_brand_idx INT;
    random_model_idx INT;
    random_supplier_rec RECORD;
BEGIN
    -- Loop through all existing asset_dictionary records
    FOR asset_rec IN SELECT id FROM public.asset_dictionary LOOP
        
        -- 1. Randomly select a contract to link to
        -- (In a real scenario, this link might already exist or be deterministic, but here we are mocking/backfilling)
        SELECT * INTO contract_rec FROM public.procurement_contracts ORDER BY random() LIMIT 1;
        
        -- 2. Select a random supplier from that contract (if any), otherwise use a default
        SELECT * INTO random_supplier_rec FROM public.contract_suppliers WHERE contract_id = contract_rec.id ORDER BY random() LIMIT 1;

        -- 3. Generate random equipment details
        random_type_idx := floor(random() * array_length(equipment_types, 1) + 1);
        random_brand_idx := floor(random() * array_length(brands, 1) + 1);
        random_model_idx := floor(random() * array_length(models, 1) + 1);

        -- 4. Update the asset_dictionary record
        UPDATE public.asset_dictionary
        SET 
            project_name = contract_rec.project_name,
            bm_number = contract_rec.bm_number,
            procurement_order = contract_rec.procurement_order,
            
            -- New fields derived from contract or random generation
            equipment_name = equipment_types[random_type_idx] || ' - ' || floor(random() * 1000)::text,
            brand = brands[random_brand_idx],
            model = models[random_model_idx] || '-' || floor(random() * 100)::text,
            unit = units[floor(random() * array_length(units, 1) + 1)],
            price = (floor(random() * 10000) + 500)::numeric, -- Random price 500 - 10500
            
            supplier = COALESCE(random_supplier_rec.supplier_name, 'Default Supplier'),
            cost_center = '上海分公司', -- Default mock value
            
            accessory_info = 'Standard accessories included',
            description = 'Auto-updated from contract: ' || contract_rec.project_name,
            
            -- Ensure attachments are synced if needed (optional, just referencing contract attachment here if null)
            attachment = COALESCE(attachment, contract_rec.attachment)
            
        WHERE id = asset_rec.id;
        
    END LOOP;
END $$;
