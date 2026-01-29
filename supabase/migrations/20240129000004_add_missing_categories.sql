INSERT INTO public.categories (name, code, description) VALUES
('通讯设备', 'comm_equip', '电话机、对讲机、通讯基站等通讯相关设备')
ON CONFLICT (code) DO NOTHING;
