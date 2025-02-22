
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://maymgnzrxjrrkqsffrsx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1heW1nbnpyeGpycmtxc2ZmcnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Mzk0MzQsImV4cCI6MjA1NTExNTQzNH0.QOk-4IxfeGfqCydQngjxePWjoHmhOyny7URffs9ui3E";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});
