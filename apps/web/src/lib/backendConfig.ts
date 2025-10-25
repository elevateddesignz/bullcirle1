const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_URL ?? '').trim();

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

const normalizedEnvBackendUrl = envBackendUrl ? stripTrailingSlash(envBackendUrl) : '';

function parseBooleanFlag(value: string | undefined | null) {
  if (!value) return undefined;
  const normalized = value.toString().trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

const useLocalApiFallback =
  (import.meta.env.VITE_USE_LOCAL_API ?? '').toString().toLowerCase() === 'true'
  || (import.meta.env.VITE_USE_LOCAL_API ?? '').toString() === '1';

const devProxyFlag = parseBooleanFlag(import.meta.env.VITE_DEV_PROXY);
const devProxyEnabled = Boolean(import.meta.env.DEV && (devProxyFlag ?? false));

// When no explicit backend URL is configured, optionally fall back to the local API during development.
const resolvedBackendBaseUrl =
  (devProxyEnabled ? '' : normalizedEnvBackendUrl)
  || (import.meta.env.DEV && useLocalApiFallback ? 'http://localhost:3000' : '');

export const backendBaseUrl = resolvedBackendBaseUrl;
export const backendUrlConfigured = Boolean(normalizedEnvBackendUrl);
export const devProxyActive = devProxyEnabled;

export function resolveBackendPath(path: string): string {
  if (ABSOLUTE_URL_REGEX.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return backendBaseUrl ? `${backendBaseUrl}${normalizedPath}` : normalizedPath;
}

export function createBackendUrl(path: string): URL {
  const resolvedPath = resolveBackendPath(path);

  if (ABSOLUTE_URL_REGEX.test(resolvedPath)) {
    return new URL(resolvedPath);
  }

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : undefined;

  if (!origin) {
    throw new Error('Unable to resolve backend URL; set VITE_BACKEND_URL or provide a window.location origin.');
  }

  return new URL(resolvedPath, origin);
}

export function resolveApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  return resolveBackendPath(apiPath);
}

export function createApiUrl(path: string): URL {
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedPath = apiPath.startsWith('/api') ? apiPath : `/api${apiPath}`;
  return createBackendUrl(normalizedPath);
}
