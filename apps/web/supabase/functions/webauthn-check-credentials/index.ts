import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const preflight = handleCorsPreflight(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ data: { error: 'Method not allowed' } }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ data: { error: 'Server configuration error' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { email } = await req.json().catch(() => ({}));

    if (typeof email !== 'string' || !email.trim()) {
      return new Response(
        JSON.stringify({ data: { error: 'Missing email' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      if (userError) console.error('Error fetching user:', userError);
      return new Response(JSON.stringify({ data: { hasCredentials: false } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', userData.user.id)
      .limit(1);

    if (credentialsError) {
      console.error('Error checking credentials:', credentialsError);
      return new Response(JSON.stringify({ data: { hasCredentials: false } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ data: { hasCredentials: Boolean(credentials?.length) } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Unexpected error in webauthn-check-credentials:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ data: { error: 'Internal server error', details: message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
