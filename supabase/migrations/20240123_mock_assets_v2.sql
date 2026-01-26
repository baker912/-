
DO $$
DECLARE
    v_contract RECORD;
    v_supplier RECORD;
    v_dict_item RECORD;
    v_dept_id UUID;
    v_cat_id UUID;
    v_dept_name TEXT;
    v_status TEXT;
    v_is_faulty BOOLEAN;
    v_factory_date DATE;
    v_arrival_date DATE;
    v_purchase_date DATE;
    v_accounting_date DATE;
    v_retirement_date DATE;
    v_asset_name TEXT;
    v_brand TEXT;
    v_model TEXT;
    v_unit TEXT;
    v_price NUMERIC;
    v_desc TEXT;
    v_emp_name TEXT;
    v_emp_code TEXT;
    v_floor TEXT;
    v_room TEXT;
    i INT;
    v_locations TEXT[] := ARRAY['开放办公区', '独立办公室', '会议室', '研发实验室', '服务器机房', '仓库'];
    v_floors TEXT[] := ARRAY['3F', '4F', '5F', '6F', '7F', '8F'];
    v_brands TEXT[] := ARRAY['联想', '戴尔', '惠普', '华为', '苹果', '小米', '思科', 'H3C'];
    v_equipment_names TEXT[] := ARRAY['高性能笔记本电脑', '台式工作站', '4K显示器', '激光打印机', '投影仪', '网络交换机', '人体工学椅', '升降办公桌'];
    v_origin_countries TEXT[] := ARRAY['中国', '中国', '中国', '美国', '德国', '日本'];
    v_first_names TEXT[] := ARRAY['伟', '芳', '娜', '敏', '静', '强', '磊', '洋', '艳', '杰', '娟', '涛', '明', '超', '秀英', '浩'];
    v_last_names TEXT[] := ARRAY['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周'];
BEGIN
    -- Loop 100 times
    FOR i IN 1..100 LOOP
        -- 1. Get random contract
        SELECT * INTO v_contract FROM procurement_contracts ORDER BY random() LIMIT 1;
        
        -- 2. Get random supplier for this contract
        SELECT * INTO v_supplier FROM contract_suppliers WHERE contract_id = v_contract.id ORDER BY random() LIMIT 1;
        
        -- Fallback if no linked supplier
        IF v_supplier IS NULL THEN
             SELECT * INTO v_supplier FROM contract_suppliers ORDER BY random() LIMIT 1;
        END IF;

        -- 3. Get random department and category
        SELECT id, name INTO v_dept_id, v_dept_name FROM departments ORDER BY random() LIMIT 1;
        SELECT id INTO v_cat_id FROM categories ORDER BY random() LIMIT 1;

        -- 4. Try to find dictionary item
        SELECT * INTO v_dict_item FROM asset_dictionary 
        WHERE project_name = v_contract.project_name AND supplier = v_supplier.supplier_name 
        ORDER BY random() LIMIT 1;

        IF v_dict_item IS NOT NULL THEN
            v_asset_name := v_dict_item.equipment_name;
            v_brand := v_dict_item.brand;
            v_model := v_dict_item.model;
            v_unit := v_dict_item.unit;
            v_price := v_dict_item.price;
            v_desc := v_dict_item.accessory_info;
        ELSE
            -- Generate random equipment info
            v_asset_name := v_equipment_names[1 + floor(random() * array_length(v_equipment_names, 1))::int];
            v_brand := v_brands[1 + floor(random() * array_length(v_brands, 1))::int];
            v_model := 'MOD-' || floor(random() * 1000)::text;
            v_unit := '台';
            v_price := 2000 + floor(random() * 20000);
            v_desc := '标准配置';
        END IF;

        -- 5. Generate Dates
        v_factory_date := (CURRENT_DATE - (floor(random() * 1000) || ' days')::interval)::date;
        v_arrival_date := v_factory_date + (floor(random() * 30) || ' days')::interval;
        v_purchase_date := v_arrival_date + (floor(random() * 7) || ' days')::interval;
        v_accounting_date := v_purchase_date + (floor(random() * 14) || ' days')::interval;
        v_retirement_date := v_purchase_date + interval '5 years';

        -- 6. Status & Employee
        IF random() < 0.6 THEN
            v_status := 'in_use';
            v_emp_name := v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int] || v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int];
            v_emp_code := 'EMP' || floor(random() * 10000 + 10000);
        ELSIF random() < 0.9 THEN
            v_status := 'in_stock';
            v_emp_name := NULL;
            v_emp_code := NULL;
        ELSE
            v_status := CASE WHEN random() < 0.5 THEN 'scrapped' ELSE 'cleared' END;
            v_emp_name := NULL;
            v_emp_code := NULL;
        END IF;

        v_is_faulty := (random() < 0.05); -- 5% faulty
        v_floor := v_floors[1 + floor(random() * array_length(v_floors, 1))::int];
        v_room := v_locations[1 + floor(random() * array_length(v_locations, 1))::int];

        -- 7. Insert
        INSERT INTO assets (
            asset_code, name, description, category_id, department_id,
            purchase_price, purchase_date, status, location,
            project_name, bm_number, purchase_order,
            brand, model, unit,
            factory_date, arrival_date, warranty_years, accounting_date,
            manufacturer, origin_country, planned_retirement_date,
            is_faulty, serial_number, floor, room_type, specific_location,
            employee_name, employee_code, department_name, entry_person
        ) VALUES (
            'AST-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(floor(random() * 1000000)::text, 6, '0'),
            v_asset_name,
            v_desc,
            v_cat_id,
            v_dept_id,
            v_price,
            v_purchase_date,
            v_status,
            v_floor || ' ' || v_room,
            v_contract.project_name,
            v_contract.bm_number,
            v_contract.procurement_order,
            v_brand,
            v_model,
            v_unit,
            v_factory_date,
            v_arrival_date,
            CASE WHEN random() < 0.3 THEN 1 WHEN random() < 0.6 THEN 3 ELSE 5 END,
            v_accounting_date,
            v_brand, -- manufacturer often same as brand
            v_origin_countries[1 + floor(random() * array_length(v_origin_countries, 1))::int],
            v_retirement_date,
            v_is_faulty,
            'SN' || md5(random()::text),
            v_floor,
            v_room,
            '工位-' || floor(random() * 200),
            v_emp_name,
            v_emp_code,
            v_dept_name,
            '系统管理员'
        );
    END LOOP;
END $$;
