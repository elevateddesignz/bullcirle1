const DEFAULT_ALLOWED_HEADERS = [
  'authorization',
  'Authorization',
  'apikey',
  'Apikey',
  'content-type',
  'Content-Type',
  'x-client-info',
  'X-Client-Info',
  'x-supabase-api-version',
  'x-requested-with',
];

export function buildCorsHeaders(
  req: Request,
  overrides: Record<string, string> = {},
): Record<string, string> {
  const origin = req.headers.get('origin') ?? '*';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS.join(', '),
    'Access-Control-Allow-Credentials': 'true',
    ...overrides,
  };
}

export function handleCorsPreflight(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}
