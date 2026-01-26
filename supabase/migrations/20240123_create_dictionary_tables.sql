
-- Create Dictionary Types table
CREATE TABLE IF NOT EXISTS sys_dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Dictionary Items table
CREATE TABLE IF NOT EXISTS sys_dictionary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dict_id UUID REFERENCES sys_dictionaries(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  status BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dict_id, value)
);

-- Enable RLS
ALTER TABLE sys_dictionaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_dictionary_items ENABLE ROW LEVEL SECURITY;

-- Create Policies (Simplified for now)
DROP POLICY IF EXISTS "Enable all for dictionaries" ON sys_dictionaries;
CREATE POLICY "Enable all for dictionaries" ON sys_dictionaries FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for dictionary items" ON sys_dictionary_items;
CREATE POLICY "Enable all for dictionary items" ON sys_dictionary_items FOR ALL TO authenticated USING (true);

-- Seed some initial data
INSERT INTO sys_dictionaries (code, name, description) VALUES
('asset_status', '资产状态', '资产的流转状态定义'),
('department_type', '部门类型', '部门的职能分类'),
('room_type', '房间类型', '房间的功能属性')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
    v_dict_id UUID;
BEGIN
    -- Seed Asset Status
    SELECT id INTO v_dict_id FROM sys_dictionaries WHERE code = 'asset_status';
    IF v_dict_id IS NOT NULL THEN
        INSERT INTO sys_dictionary_items (dict_id, label, value, sort_order, status) VALUES
        (v_dict_id, '在库', 'in_stock', 10, true),
        (v_dict_id, '在用', 'in_use', 20, true),
        (v_dict_id, '维修中', 'maintenance', 30, true),
        (v_dict_id, '已报废', 'scrapped', 40, true),
        (v_dict_id, '已处置', 'disposed', 50, true),
        (v_dict_id, '已清运', 'cleared', 60, true)
        ON CONFLICT (dict_id, value) DO NOTHING;
    END IF;

    -- Seed Room Type
    SELECT id INTO v_dict_id FROM sys_dictionaries WHERE code = 'room_type';
    IF v_dict_id IS NOT NULL THEN
        INSERT INTO sys_dictionary_items (dict_id, label, value, sort_order, status) VALUES
        (v_dict_id, '开放办公区', 'open_office', 10, true),
        (v_dict_id, '独立办公室', 'private_office', 20, true),
        (v_dict_id, '会议室', 'meeting_room', 30, true),
        (v_dict_id, '研发实验室', 'lab', 40, true),
        (v_dict_id, '服务器机房', 'server_room', 50, true),
        (v_dict_id, '仓库', 'warehouse', 60, true)
        ON CONFLICT (dict_id, value) DO NOTHING;
    END IF;
END $$;
