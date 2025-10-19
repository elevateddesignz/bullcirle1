import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'http://localhost:54321';
const FALLBACK_SUPABASE_ANON_KEY = 'public-anon-key';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const isPlaceholder = (value: string) =>
  !value
  || value.includes('your-supabase-project.supabase.co')
  || value === FALLBACK_SUPABASE_URL;

const supabaseUrl = isPlaceholder(rawSupabaseUrl) ? FALLBACK_SUPABASE_URL : rawSupabaseUrl;
const supabaseAnonKey = rawSupabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY;

if (isPlaceholder(rawSupabaseUrl) || !rawSupabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing or placeholders. Using local development defaults. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for real data.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
