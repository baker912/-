
DO $$
DECLARE
    contract_rec RECORD;
    -- Expanded supplier list
    cn_suppliers TEXT[] := ARRAY[
        '上海科技发展有限公司', '北京联想信息技术', '深圳华为终端', '广州数码港', '杭州网络科技', 
        '成都系统集成商', '武汉光电子股份', '南京软件服务中心', '西安数据存储专家', '苏宁易购企业购',
        '京东企业服务', '戴尔中国分公司', '神州数码集成', '紫光华山科技', '浪潮电子信息',
        '中科曙光', '同方计算机', '宏碁电脑上海', '华硕电脑中国', '技嘉科技'
    ];
    cn_contacts TEXT[] := ARRAY['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二'];
    supplier_count INT;
BEGIN
    -- 1. Clear existing suppliers
    DELETE FROM public.contract_suppliers;

    -- 2. Re-populate for each contract
    FOR contract_rec IN SELECT id FROM public.procurement_contracts LOOP
        
        -- Decide how many suppliers (1 to 3)
        supplier_count := floor(random() * 3 + 1);

        -- Efficiently insert unique random suppliers
        INSERT INTO public.contract_suppliers (
            contract_id,
            supplier_name,
            contact_person,
            contact_phone,
            contract_files,
            order_files,
            payment_files,
            acceptance_files
        )
        SELECT 
            contract_rec.id,
            s.supplier_name,
            cn_contacts[floor(random() * array_length(cn_contacts, 1) + 1)],
            '138' || lpad(floor(random() * 100000000)::text, 8, '0'),
            '[]'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb
        FROM (
            SELECT unnest(cn_suppliers) as supplier_name 
            ORDER BY random() 
            LIMIT supplier_count
        ) s;
        
    END LOOP;
END $$;
