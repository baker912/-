
DO $$
DECLARE
    rec RECORD;
    v_equip_count INT;
    v_equip_idx INT;
    j INT;
    
    -- Equipment data pools
    v_categories TEXT[] := ARRAY['笔记本电脑', '台式机', '显示器', '打印机', '服务器', '交换机', '投影仪', '会议大屏'];
    v_brands_it TEXT[] := ARRAY['联想', '戴尔', '惠普', '华为', '苹果', '小米'];
    v_brands_net TEXT[] := ARRAY['思科', '华为', '华三', '锐捷'];
    v_brands_office TEXT[] := ARRAY['惠普', '佳能', '爱普生', '索尼'];
    
    v_name TEXT;
    v_brand TEXT;
    v_model TEXT;
    v_price NUMERIC;
    v_desc TEXT;
    
BEGIN
    -- 1. Clear existing dictionary
    DELETE FROM public.asset_dictionary;

    -- 2. Iterate through all valid Project-Supplier pairs
    FOR rec IN 
        SELECT pc.project_name, pc.bm_number, pc.procurement_order, cs.supplier_name 
        FROM procurement_contracts pc
        JOIN contract_suppliers cs ON pc.id = cs.contract_id
    LOOP
        -- Determine how many items to create for this pair (1 to 3)
        v_equip_count := floor(random() * 3 + 1);

        FOR j IN 1..v_equip_count LOOP
            
            -- Randomly pick a category index
            v_equip_idx := floor(random() * array_length(v_categories, 1) + 1);
            v_name := v_categories[v_equip_idx];
            
            -- Assign Brand based on Category
            IF v_name IN ('服务器', '交换机') THEN
                v_brand := v_brands_net[floor(random() * array_length(v_brands_net, 1) + 1)];
                v_price := 5000 + floor(random() * 50000);
            ELSIF v_name IN ('打印机', '投影仪', '会议大屏') THEN
                 v_brand := v_brands_office[floor(random() * array_length(v_brands_office, 1) + 1)];
                 v_price := 2000 + floor(random() * 10000);
            ELSE
                 v_brand := v_brands_it[floor(random() * array_length(v_brands_it, 1) + 1)];
                 v_price := 3000 + floor(random() * 15000);
            END IF;

            v_model := v_brand || '-' || chr(65 + floor(random() * 26)::int) || floor(random() * 1000)::text;
            v_desc := '含标准配件，保修' || (floor(random() * 3 + 1)) || '年';

            -- Insert into asset_dictionary
            INSERT INTO public.asset_dictionary (
                project_name,
                bm_number,
                procurement_order,
                supplier,
                equipment_name,
                brand,
                model,
                unit,
                price,
                accessory_info,
                description,
                cost_center,
                created_at,
                updated_at
            ) VALUES (
                rec.project_name,
                rec.bm_number,
                rec.procurement_order,
                rec.supplier_name,
                v_name,
                v_brand,
                v_model,
                '台',
                v_price,
                v_desc,
                '自动生成数据',
                '上海分公司',
                NOW(),
                NOW()
            );
        END LOOP;

    END LOOP;
END $$;
