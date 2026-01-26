DO $$
DECLARE
    cat_id UUID;
    dept_id UUID;
    user_id UUID;
    i INT;
BEGIN
    -- Get valid IDs
    SELECT id INTO cat_id FROM public.categories LIMIT 1;
    SELECT id INTO dept_id FROM public.departments LIMIT 1;
    SELECT id INTO user_id FROM public.users LIMIT 1;

    IF cat_id IS NOT NULL AND dept_id IS NOT NULL THEN
        FOR i IN 1..30 LOOP
            INSERT INTO public.assets (
                asset_code,
                name,
                category_id,
                department_id,
                purchase_price,
                purchase_date,
                status,
                purchase_order,
                managed_by,
                employee_name
            ) VALUES (
                'PO-EXTRA-' || i || '-' || floor(random() * 1000)::text,
                '批量采购设备-' || i,
                cat_id,
                dept_id,
                3000 + floor(random() * 2000),
                NOW() - (floor(random() * 30) || ' days')::interval,
                CASE WHEN random() > 0.5 THEN 'in_stock' ELSE 'in_use' END,
                'PO059572',
                user_id,
                CASE WHEN random() > 0.5 THEN NULL ELSE '员工-' || i END
            );
        END LOOP;
    END IF;
END $$;
