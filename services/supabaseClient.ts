import { createClient } from "@supabase/supabase-js";

// IMPORTANT: These are the Supabase credentials for the application.
// The previous credentials were for an inactive/unreachable project.
// These have been updated to a new, active project to resolve connection errors.
const supabaseUrl = "https://hjcnpmgxxwbygxfgzest.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY25wbWd4eHdieWd4Zmd6ZXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTAwNjcsImV4cCI6MjA3NzMyNjA2N30.HVyaE7NTc9LuhkG2SiNFAiNzFuqNNLAPIKKq7k_tK8k";

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };