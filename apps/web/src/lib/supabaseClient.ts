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

export const resolvedSupabaseUrl = supabaseUrl;
export const resolvedSupabaseAnonKey = supabaseAnonKey;

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
  !isPlaceholder(rawSupabaseUrl)
  && (proxyPreference ?? (import.meta.env.DEV && backendLooksLocal))
);

const supabaseProxyBase = resolveBackendPath('/supabase');

function mergeHeaders(...sources: (HeadersInit | undefined)[]) {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

const proxiedFetch: typeof fetch = async (input, init) => {
  if (!shouldProxySupabase || !rawSupabaseUrl) {
    return fetch(input as any, init);
  }

  const rewriteUrl = (url: string) =>
    url.startsWith(rawSupabaseUrl) ? url.replace(rawSupabaseUrl, supabaseProxyBase) : url;
  const applyHeaders = (existing?: HeadersInit) => {
    const headers = mergeHeaders(existing);
    headers.set('x-supabase-url', rawSupabaseUrl);
    if (supabaseAnonKey) {
      headers.set('x-supabase-key', supabaseAnonKey);
    }
    return headers;
  };

  if (typeof input === 'string') {
    return fetch(rewriteUrl(input), {
      ...init,
      headers: applyHeaders(init?.headers),
    });
  }

  if (input instanceof URL) {
    return fetch(rewriteUrl(input.toString()), {
      ...init,
      headers: applyHeaders(init?.headers),
    });
  }

  if (input instanceof Request) {
    const cloned = input.clone();
    let body: BodyInit | null | undefined;
    if (!(input.method === 'GET' || input.method === 'HEAD')) {
      body = await cloned.blob();
    }
    const proxiedRequest = new Request(rewriteUrl(input.url), {
      method: input.method,
      headers: applyHeaders(input.headers),
      body: body ?? undefined,
      cache: input.cache,
      credentials: input.credentials,
      integrity: input.integrity,
      keepalive: input.keepalive,
      mode: input.mode,
      redirect: input.redirect,
      referrer: input.referrer,
      referrerPolicy: input.referrerPolicy,
      signal: input.signal,
    } as RequestInit);
    return fetch(proxiedRequest, init);
  }

  return fetch(input as any, {
    ...init,
    headers: applyHeaders(init?.headers),
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, shouldProxySupabase ? {
  global: {
    fetch: proxiedFetch,
  },
} : undefined);
