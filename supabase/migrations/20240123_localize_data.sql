
DO $$
DECLARE
    contract_rec RECORD;
    asset_rec RECORD;
    
    -- 中文数据池
    cn_project_prefixes TEXT[] := ARRAY['服务器扩容项目', '网络设备升级工程', '办公室装修采购', '笔记本电脑年度采购', '软件授权续费', '云平台迁移服务', '数据中心冷却系统改造', '办公家具补充采购', '安防监控系统部署', '会议室多媒体升级'];
    cn_suppliers TEXT[] := ARRAY['上海科技发展有限公司', '北京联想信息技术', '深圳华为终端', '广州数码港', '杭州网络科技', '成都系统集成商', '武汉光电子股份', '南京软件服务中心', '西安数据存储专家', '苏宁易购企业购'];
    cn_contacts TEXT[] := ARRAY['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二'];
    
    cn_equipment_types TEXT[] := ARRAY['笔记本电脑', '台式机', '机架式服务器', '显示器', '激光打印机', '高速扫描仪', '高清投影仪', '企业级路由器', '核心交换机', '硬件防火墙'];
    cn_brands TEXT[] := ARRAY['联想', '惠普', '戴尔', '华为', '小米', '苹果', '思科', '爱普生', '佳能', '三星'];
    cn_models TEXT[] := ARRAY['ThinkPad X1', 'MateBook Pro', 'Latitude 7000', 'PowerEdge R750', 'Catalyst 9200', 'LaserJet M1005', 'U2723QE', 'iPad Pro', 'Galaxy Tab S9', 'Precision 3000'];
    
    random_idx INT;
    new_name TEXT;
    new_supplier TEXT;
    new_contact TEXT;
BEGIN
    -- 1. 更新采购合同数据 (Procurement Contracts)
    FOR contract_rec IN SELECT id FROM public.procurement_contracts LOOP
        random_idx := floor(random() * array_length(cn_project_prefixes, 1) + 1);
        new_name := cn_project_prefixes[random_idx] || ' - ' || floor(random() * 100)::text || '期';
        
        UPDATE public.procurement_contracts
        SET 
            project_name = new_name,
            description = '自动生成的中文描述：' || new_name
        WHERE id = contract_rec.id;
        
        -- 更新该合同下的供应商数据
        UPDATE public.contract_suppliers
        SET 
            supplier_name = cn_suppliers[floor(random() * array_length(cn_suppliers, 1) + 1)],
            contact_person = cn_contacts[floor(random() * array_length(cn_contacts, 1) + 1)]
        WHERE contract_id = contract_rec.id;
    END LOOP;

    -- 2. 更新资产类目数据 (Asset Dictionary)
    -- 注意：资产类目的项目名称和供应商通常是关联带出的，但这里是字典表，也可能独立存在。
    -- 为了保持一致性，如果关联了合同，应该同步更新（但这里简化处理，直接更新所有记录为中文，模拟真实数据）
    FOR asset_rec IN SELECT id FROM public.asset_dictionary LOOP
        -- 重新随机生成中文设备信息
        UPDATE public.asset_dictionary
        SET 
            equipment_name = cn_equipment_types[floor(random() * array_length(cn_equipment_types, 1) + 1)],
            brand = cn_brands[floor(random() * array_length(cn_brands, 1) + 1)],
            model = cn_models[floor(random() * array_length(cn_models, 1) + 1)],
            supplier = cn_suppliers[floor(random() * array_length(cn_suppliers, 1) + 1)], -- 覆盖之前的英文供应商
            accessory_info = '包含标准配件包',
            description = '系统自动汉化数据',
            project_name = (SELECT project_name FROM public.procurement_contracts WHERE bm_number = asset_dictionary.bm_number LIMIT 1) -- 尝试同步项目名（如果BM单号匹配）
        WHERE id = asset_rec.id;
        
        -- 如果没匹配到项目名（可能是脏数据），随机给一个中文项目名
        UPDATE public.asset_dictionary
        SET project_name = cn_project_prefixes[floor(random() * array_length(cn_project_prefixes, 1) + 1)] || ' (补)'
        WHERE id = asset_rec.id AND project_name ~ '[a-zA-Z]'; -- 仅更新还是英文的
    END LOOP;
END $$;
