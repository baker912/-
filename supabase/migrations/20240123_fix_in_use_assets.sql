
DO $$
DECLARE
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"},
        {"name": "王五", "code": "EMP1003", "dept": "财务部"},
        {"name": "赵六", "code": "EMP1004", "dept": "行政部"},
        {"name": "钱七", "code": "EMP1005", "dept": "销售部"}
    ]';
    v_asset_rec RECORD;
    v_user_idx INT;
    v_user JSONB;
BEGIN
    -- Find all assets that are 'in_use' but have no employee_name
    FOR v_asset_rec IN (SELECT id FROM assets WHERE status = 'in_use' AND (employee_name IS NULL OR employee_name = '')) LOOP
        v_user_idx := floor(random() * 5);
        v_user := v_users->v_user_idx;
        
        -- Update the asset with a random user
        UPDATE assets SET 
            employee_name = v_user->>'name',
            employee_code = v_user->>'code',
            department_name = v_user->>'dept',
            location = '补充-办公位-' || floor(random() * 100)
        WHERE id = v_asset_rec.id;
        
    END LOOP;
END $$;
