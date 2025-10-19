import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@8.3.5';
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
      return new Response(JSON.stringify({ data: { error: 'User not found' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, public_key')
      .eq('user_id', userData.user.id);

    if (credentialsError || !credentials?.length) {
      if (credentialsError) console.error('Error fetching credentials:', credentialsError);
      return new Response(JSON.stringify({ data: { error: 'No credentials found for this user' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: new URL(supabaseUrl).hostname,
      allowCredentials: credentials.map((credential) => ({
        id: new Uint8Array(credential.credential_id as Uint8Array),
        type: 'public-key',
        transports: ['internal', 'usb', 'nfc', 'ble', 'hybrid'],
      })),
      userVerification: 'preferred',
      timeout: 60_000,
    });

    const { error: challengeError } = await supabase
      .from('webauthn_challenges')
      .insert({
        user_id: userData.user.id,
        challenge: options.challenge,
        type: 'authentication',
      });

    if (challengeError) {
      console.error('Error storing challenge:', challengeError);
      return new Response(JSON.stringify({ data: { error: 'Failed to store challenge' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: { challenge: options } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in webauthn-authenticate:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ data: { error: 'Authentication failed', details: message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
