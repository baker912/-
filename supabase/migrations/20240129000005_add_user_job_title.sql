
-- Add job_title column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title VARCHAR;

-- Update existing users with fake job titles (optional, but good for completeness)
UPDATE public.users SET job_title = '企业IT开发部部长' WHERE email LIKE '%cheng.guo%';
UPDATE public.users SET job_title = '高级工程师' WHERE email = 'admin';
