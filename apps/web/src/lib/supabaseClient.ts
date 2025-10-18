import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'http://localhost:54321';
const FALLBACK_SUPABASE_ANON_KEY = 'public-anon-key';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? FALLBACK_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Missing Supabase environment variables. Falling back to local development defaults.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
