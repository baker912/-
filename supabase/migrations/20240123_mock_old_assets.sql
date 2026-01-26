DO $$
DECLARE
    cat_ids UUID[];
    dept_ids UUID[];
    user_id UUID;
    i INT;
    random_cat UUID;
    random_dept UUID;
BEGIN
    -- Fetch all categories and departments into arrays to randomly select
    SELECT ARRAY(SELECT id FROM public.categories) INTO cat_ids;
    SELECT ARRAY(SELECT id FROM public.departments) INTO dept_ids;
    SELECT id INTO user_id FROM public.users LIMIT 1;

    -- Ensure we have at least one category and department
    IF array_length(cat_ids, 1) > 0 AND array_length(dept_ids, 1) > 0 THEN
        FOR i IN 1..15 LOOP
            -- Select random category and department
            random_cat := cat_ids[1 + floor(random() * array_length(cat_ids, 1))::int];
            random_dept := dept_ids[1 + floor(random() * array_length(dept_ids, 1))::int];

            INSERT INTO public.assets (
                asset_code, 
                name, 
                description, 
                category_id, 
                department_id, 
                purchase_price, 
                purchase_date, 
                status, 
                location, 
                managed_by
            ) VALUES (
                'OLD-' || to_char(now(), 'HHMISS') || '-' || i, -- Ensure uniqueness
                '老旧服务器-' || i,
                '用于测试健康预警的超期设备',
                random_cat,
                random_dept,
                5000 + (random() * 10000)::decimal(10,2),
                -- Generate a date between 5 and 10 years ago (approx 1825 to 3650 days)
                CURRENT_DATE - (1825 + floor(random() * 1825)::int), 
                'in_use', -- Mostly in use to be critical
                '机房B区',
                user_id
            );
        END LOOP;
    END IF;
END $$;
