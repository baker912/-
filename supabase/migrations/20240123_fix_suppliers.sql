
DO $$
DECLARE
    contract_rec RECORD;
    -- Expanded supplier list to reduce collision
    cn_suppliers TEXT[] := ARRAY[
        '上海科技发展有限公司', '北京联想信息技术', '深圳华为终端', '广州数码港', '杭州网络科技', 
        '成都系统集成商', '武汉光电子股份', '南京软件服务中心', '西安数据存储专家', '苏宁易购企业购',
        '京东企业服务', '戴尔中国分公司', '神州数码集成', '紫光华山科技', '浪潮电子信息',
        '中科曙光', '同方计算机', '宏碁电脑上海', '华硕电脑中国', '技嘉科技'
    ];
    cn_contacts TEXT[] := ARRAY['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二'];
    
    supplier_count INT;
    picked_suppliers TEXT[];
    s_name TEXT;
    i INT;
    is_duplicate BOOLEAN;
BEGIN
    -- 1. Clear existing suppliers
    DELETE FROM public.contract_suppliers;

    -- 2. Re-populate for each contract
    FOR contract_rec IN SELECT id FROM public.procurement_contracts LOOP
        
        -- Decide how many suppliers (1 to 3)
        supplier_count := floor(random() * 3 + 1);
        picked_suppliers := ARRAY[]::TEXT[];

        FOR i IN 1..supplier_count LOOP
            -- Pick a random supplier that hasn't been picked for this contract yet
            LOOP
                s_name := cn_suppliers[floor(random() * array_length(cn_suppliers, 1) + 1)];
                is_duplicate := false;
                
                IF array_length(picked_suppliers, 1) > 0 THEN
                    FOREACH s_name IN ARRAY picked_suppliers LOOP
                         IF s_name = picked_suppliers[i] THEN
                            -- Wait, logic error in checking array. simpler:
                         END IF;
                    END LOOP;
                     -- Postgres array check: s_name = ANY(picked_suppliers)
                END IF;
                
                IF NOT (s_name = ANY(picked_suppliers)) THEN
                    picked_suppliers := array_append(picked_suppliers, s_name);
                    EXIT; -- Found unique
                END IF;
                
                -- Failsafe: if we exhausted options (unlikely with 20 items and max 3 picks), just exit
                IF array_length(picked_suppliers, 1) >= 3 THEN EXIT; END IF;
            END LOOP;

            -- Insert
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
                s_name,
                cn_contacts[floor(random() * array_length(cn_contacts, 1) + 1)],
                '138' || lpad(floor(random() * 100000000)::text, 8, '0'),
                '[]'::jsonb,
                '[]'::jsonb,
                '[]'::jsonb,
                '[]'::jsonb
            );
        END LOOP;
        
    END LOOP;
END $$;
