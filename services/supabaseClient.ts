import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "https://hjcnpmgxxwbygxfgzest.supabase.co";
const fallbackAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY25wbWd4eHdieWd4Zmd6ZXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTAwNjcsImV4cCI6MjA3NzMyNjA2N30.HVyaE7NTc9LuhkG2SiNFAiNzFuqNNLAPIKKq7k_tK8k";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error("Supabase config missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "clubhub-auth-token"
  },
  global: {
    headers: {
      apikey: supabaseAnonKey
    }
  }
});

export { supabase };
