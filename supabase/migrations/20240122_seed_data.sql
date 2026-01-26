
-- Insert Categories
INSERT INTO public.categories (name, code, description) VALUES
('电子设备', 'ELEC', '电脑、显示器、打印机等'),
('办公家具', 'FURN', '桌椅、柜子等'),
('车辆', 'VEHI', '公司公务用车'),
('软件授权', 'SOFT', '各类办公软件、设计软件授权'),
('其他', 'OTHR', '其他杂项资产')
ON CONFLICT (code) DO NOTHING;

-- Insert Departments
INSERT INTO public.departments (name, code) VALUES
('研发部', 'RND'),
('市场部', 'MKT'),
('人事部', 'HR'),
('财务部', 'FIN'),
('行政部', 'ADM')
ON CONFLICT (code) DO NOTHING;
