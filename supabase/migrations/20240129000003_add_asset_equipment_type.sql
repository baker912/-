
    ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS equipment_type VARCHAR;
    
    COMMENT ON COLUMN assets.equipment_type IS '设备分类: 员工笔记本, 台式机等';
  