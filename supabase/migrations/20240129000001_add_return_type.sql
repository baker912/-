
    ALTER TABLE asset_requests
    ADD COLUMN IF NOT EXISTS return_type VARCHAR DEFAULT 'normal';
    
    COMMENT ON COLUMN asset_requests.return_type IS '归还类型: normal-普通归还, resignation-离职归还';
  