
-- Insert predefined categories
INSERT INTO public.categories (name, code, description) VALUES
('办公设备', 'office_equip', '日常办公使用的设备，如电脑、打印机等'),
('会议设备', 'meeting_equip', '会议室使用的设备，如投影仪、音响等'),
('一卡通设备', 'card_equip', '门禁、考勤、消费等一卡通相关设备'),
('网络设备', 'net_equip', '交换机、路由器、防火墙等网络基础设施'),
('非标准办公设备', 'non_std_equip', '特殊用途或非标准化的办公辅助设备')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
