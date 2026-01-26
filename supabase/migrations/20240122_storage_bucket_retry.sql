
-- NOTE: If this fails in local migration due to missing 'storage' schema access or other issues,
-- it might be because 'storage' extension or schema isn't fully managed via standard SQL migrations in some setups.
-- However, we will try to run it. If it fails, we will assume manual setup or skip for now.

-- Ensure storage schema exists (usually default in Supabase)
-- CREATE SCHEMA IF NOT EXISTS storage; -- Cannot create schema if not superuser sometimes

-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('request_attachments', 'request_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'request_attachments');

-- Policy to allow authenticated downloads
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'request_attachments');
