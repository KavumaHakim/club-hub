import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "https://tbodpovakrkbeusnuiyj.supabase.co";
const fallbackAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Rwb3Zha3JrYmV1c251aXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODgxNTcsImV4cCI6MjA5NTM2NDE1N30.3pvS-7ogpPvn-cHZqS5vS-HeEdas5HBEBBEh0H6__1A";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error("Supabase config missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      apikey: supabaseAnonKey
    }
  }
});

export { supabase };
