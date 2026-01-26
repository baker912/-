import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trdyesnfxlbysybepgyh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZHllc25meGxieXN5YmVwZ3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzY3NTEsImV4cCI6MjA4NDY1Mjc1MX0.gC_BT-Koq4yVzvSanYQs9eQDWYJ6R4ZtKPRVWzFhgJM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
