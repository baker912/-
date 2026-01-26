
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://trdyesnfxlbysybepgyh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZHllc25meGxieXN5YmVwZ3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzY3NTEsImV4cCI6MjA4NDY1Mjc1MX0.gC_BT-Koq4yVzvSanYQs9eQDWYJ6R4ZtKPRVWzFhgJM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { count, error } = await supabase.from("assets").select("*", { count: "exact", head: true });
  console.log("Total Count in DB (head=true):", count);

  const { data: allAssets } = await supabase.from("assets").select("id, status");
  console.log("Fetched Assets Length:", allAssets?.length);

  const statusCounts: any = {};
  allAssets?.forEach((a: any) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  console.log("Status Counts:", statusCounts);
}

check();
