DO $$
DECLARE
    asset_ids UUID[];
BEGIN
    -- Get up to 10 valid asset IDs
    SELECT ARRAY(SELECT id FROM public.assets LIMIT 10) INTO asset_ids;
    
    -- If we don't have enough assets, we can't do much, but assuming there are some.
    IF array_length(asset_ids, 1) >= 1 THEN
    
        -- 1. Requisition (领用) - NOW()
        INSERT INTO public.asset_flow_records 
            (asset_id, operation_type, operator, target_employee_name, operation_time, description)
        VALUES 
            (asset_ids[1], 'requisition', '管理员', '张伟', NOW(), '新员工入职领用');
            
        -- 2. Borrow (借用) - 5 mins ago
        IF array_length(asset_ids, 1) >= 2 THEN
            INSERT INTO public.asset_flow_records 
                (asset_id, operation_type, operator, target_employee_name, operation_time, description)
            VALUES 
                (asset_ids[2], 'borrow', '管理员', '李强', NOW() - INTERVAL '5 minutes', '项目测试借用');
        END IF;
        
        -- 3. Return (归还) - 10 mins ago
        IF array_length(asset_ids, 1) >= 3 THEN
            INSERT INTO public.asset_flow_records 
                (asset_id, operation_type, operator, target_employee_name, operation_time, description)
            VALUES 
                (asset_ids[3], 'return', '李强', '库房', NOW() - INTERVAL '10 minutes', '测试完毕归还');
        END IF;

        -- 4. Transfer (转移) - 15 mins ago
        IF array_length(asset_ids, 1) >= 4 THEN
            INSERT INTO public.asset_flow_records 
                (asset_id, operation_type, operator, target_employee_name, operation_time, description, target_department_name)
            VALUES 
                (asset_ids[4], 'transfer', '管理员', '王芳', NOW() - INTERVAL '15 minutes', '部门调动资产转移', '财务部');
        END IF;
        
        -- 5. Scrap (报废) - 20 mins ago
        IF array_length(asset_ids, 1) >= 5 THEN
            INSERT INTO public.asset_flow_records 
                (asset_id, operation_type, operator, target_employee_name, operation_time, description)
            VALUES 
                (asset_ids[5], 'scrap', '管理员', '-', NOW() - INTERVAL '20 minutes', '设备老化无法修复');
        END IF;

        -- 6. Inbound (入库) - 30 mins ago (Bonus)
        INSERT INTO public.asset_flow_records 
            (asset_id, operation_type, operator, target_employee_name, operation_time, description)
        VALUES 
            (asset_ids[1], 'inbound', '采购员', '库房', NOW() - INTERVAL '30 minutes', '新购设备入库');

    END IF;
END $$;
