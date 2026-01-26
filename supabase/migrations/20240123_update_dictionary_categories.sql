
DO $$
DECLARE
    v_cat_ids UUID[];
    v_dict_rec RECORD;
    v_random_cat_id UUID;
BEGIN
    -- Get IDs of the 5 valid categories
    SELECT ARRAY_AGG(id) INTO v_cat_ids FROM public.categories 
    WHERE name IN ('办公设备', '会议设备', '一卡通设备', '网络设备', '非标准办公设备');

    -- Update asset_dictionary items with invalid or null category_id
    FOR v_dict_rec IN (
        SELECT id FROM public.asset_dictionary 
        WHERE category_id IS NULL 
           OR category_id NOT IN (SELECT id FROM public.categories)
    ) LOOP
        -- Pick a random category ID from the valid list
        v_random_cat_id := v_cat_ids[floor(random() * array_length(v_cat_ids, 1) + 1)];
        
        UPDATE public.asset_dictionary 
        SET category_id = v_random_cat_id 
        WHERE id = v_dict_rec.id;
    END LOOP;
END $$;
