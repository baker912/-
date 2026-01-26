
-- 1. Delete categories that are NOT in the allowed list
DELETE FROM public.categories 
WHERE name NOT IN ('办公设备', '会议设备', '一卡通设备', '网络设备', '非标准办公设备');

-- 2. Ensure allowed categories exist (idempotent)
INSERT INTO public.categories (name, code, description) VALUES
('办公设备', 'office_equip', '日常办公使用的设备，如电脑、打印机等'),
('会议设备', 'meeting_equip', '会议室使用的设备，如投影仪、音响等'),
('一卡通设备', 'card_equip', '门禁、考勤、消费等一卡通相关设备'),
('网络设备', 'net_equip', '交换机、路由器、防火墙等网络基础设施'),
('非标准办公设备', 'non_std_equip', '特殊用途或非标准化的办公辅助设备')
ON CONFLICT (code) DO NOTHING;

-- 3. Randomly assign valid categories to existing assets that have null or invalid category_id
DO $$
DECLARE
    v_cat_ids UUID[];
    v_asset_id UUID;
    v_random_cat_id UUID;
BEGIN
    -- Get IDs of the 5 valid categories
    SELECT ARRAY_AGG(id) INTO v_cat_ids FROM public.categories;

    -- Update assets with invalid or null category_id
    FOR v_asset_id IN (
        SELECT id FROM public.assets 
        WHERE category_id IS NULL 
           OR category_id NOT IN (SELECT id FROM public.categories)
    ) LOOP
        -- Pick a random category ID
        v_random_cat_id := v_cat_ids[floor(random() * array_length(v_cat_ids, 1) + 1)];
        
        UPDATE public.assets 
        SET category_id = v_random_cat_id 
        WHERE id = v_asset_id;
    END LOOP;
END $$;
