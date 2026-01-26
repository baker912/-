
DO $$
DECLARE
    v_project_names TEXT[] := ARRAY['项目A', '项目B', '项目C', '总部运营'];
    v_suppliers TEXT[] := ARRAY['联想', '戴尔', '惠普', '苹果'];
    v_categories TEXT[] := ARRAY['笔记本电脑', '台式机', '显示器'];
    i INT;
    v_name TEXT;
    v_brand TEXT;
BEGIN
    -- Insert 50 new assets as 'in_stock'
    FOR i IN 1..50 LOOP
        v_brand := v_suppliers[floor(random() * 4 + 1)];
        v_name := v_categories[floor(random() * 3 + 1)];
        
        INSERT INTO assets (
            name,
            asset_code,
            serial_number,
            brand,
            model,
            status,
            project_name,
            supplier,
            purchase_date,
            purchase_price,
            created_at,
            updated_at
        ) VALUES (
            v_name,
            'ZC-NEW-' || lpad(i::text, 4, '0'),
            'SN-NEW-' || lpad(i::text, 6, '0'),
            v_brand,
            v_brand || '-Model-' || i,
            'in_stock', -- Important: Make them available for requisition
            v_project_names[floor(random() * 4 + 1)],
            v_brand,
            NOW(),
            5000 + floor(random() * 5000),
            NOW(),
            NOW()
        );
    END LOOP;
END $$;
