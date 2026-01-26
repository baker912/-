
-- Add new columns to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS floor TEXT,
ADD COLUMN IF NOT EXISTS room_type TEXT,
ADD COLUMN IF NOT EXISTS specific_location TEXT,
ADD COLUMN IF NOT EXISTS factory_date DATE,
ADD COLUMN IF NOT EXISTS arrival_date DATE,
ADD COLUMN IF NOT EXISTS warranty_years INTEGER,
ADD COLUMN IF NOT EXISTS accounting_date DATE,
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS origin_country TEXT,
ADD COLUMN IF NOT EXISTS planned_retirement_date DATE,
ADD COLUMN IF NOT EXISTS is_faulty BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS entry_person TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS bm_number TEXT,
ADD COLUMN IF NOT EXISTS purchase_order TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS employee_name TEXT,
ADD COLUMN IF NOT EXISTS employee_code TEXT,
ADD COLUMN IF NOT EXISTS department_name TEXT,
ADD COLUMN IF NOT EXISTS last_record TEXT DEFAULT '入库';

-- Update status check constraint if needed (or just rely on application logic, but let's be safe)
-- Dropping existing constraint if it exists is complex in pure SQL without knowing name, 
-- so we'll just allow text and manage values in app, or assume existing values map well.
-- Current: in_stock, in_use, maintenance, disposed.
-- New: in_stock (在库), in_use (在用), scrapped (报废), cleared (清运).
-- We can map 'disposed' to '报废', add 'cleared'. 'maintenance' can stay or be '故障'? 
-- User said "状态有在库、在用、报废、清运，是否故障这些字段". "是否故障" is separate boolean.
-- So status list: in_stock, in_use, scrapped, cleared.

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_status_check CHECK (status IN ('in_stock', 'in_use', 'maintenance', 'disposed', 'scrapped', 'cleared'));
