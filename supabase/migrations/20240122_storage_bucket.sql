
-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('request_attachments', 'request_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'request_attachments');

-- Policy to allow authenticated users to view files
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'request_attachments');

-- Policy to allow authenticated users to delete their own files (optional but good)
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'request_attachments' AND auth.uid() = owner);
