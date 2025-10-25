import { createClient } from '@supabase/supabase-js';
import { resolveBackendPath, backendBaseUrl } from './backendConfig';

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

const proxyFlagRaw = (import.meta.env.VITE_PROXY_SUPABASE ?? '').toString().trim().toLowerCase();
const proxyPreference =
  proxyFlagRaw === 'true' || proxyFlagRaw === '1'
    ? true
    : proxyFlagRaw === 'false' || proxyFlagRaw === '0'
      ? false
      : undefined;

const backendLooksLocal =
  !backendBaseUrl
  || backendBaseUrl.includes('localhost')
  || backendBaseUrl.startsWith('http://127.')
  || backendBaseUrl.startsWith('http://0.0.0.0');

const shouldProxySupabase = Boolean(
  import.meta.env.DEV
  && !isPlaceholder(rawSupabaseUrl)
  && (proxyPreference ?? backendLooksLocal)
);

const supabaseProxyBase = resolveBackendPath('/supabase');

const proxiedFetch: typeof fetch = async (input, init) => {
  if (!shouldProxySupabase || !rawSupabaseUrl) {
    return fetch(input as any, init);
  }

  const rewriteUrl = (url: string) =>
    url.startsWith(rawSupabaseUrl) ? url.replace(rawSupabaseUrl, supabaseProxyBase) : url;

  if (typeof input === 'string') {
    return fetch(rewriteUrl(input), init);
  }

  if (input instanceof URL) {
    return fetch(rewriteUrl(input.toString()), init);
  }

  if (input instanceof Request) {
    const rewrittenUrl = rewriteUrl(input.url);
    if (rewrittenUrl !== input.url) {
      const proxiedRequest = new Request(rewrittenUrl, input);
      return fetch(proxiedRequest, init);
    }
  }

  return fetch(input as any, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, shouldProxySupabase ? {
  global: {
    fetch: proxiedFetch,
  },
} : undefined);
