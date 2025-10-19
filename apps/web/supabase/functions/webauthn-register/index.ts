import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@8.3.5';
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

    const { userId, email } = await req.json().catch(() => ({}));
    if (!userId || typeof email !== 'string' || !email.trim()) {
      return new Response(
        JSON.stringify({ data: { error: 'Missing required parameters' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingCreds } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId);

    const options = await generateRegistrationOptions({
      rpName: 'Bull Circle',
      rpID: new URL(supabaseUrl).hostname,
      userID: userId,
      userName: email,
      userDisplayName: email.split('@')[0] ?? email,
      attestationType: 'none',
      excludeCredentials: existingCreds?.map((cred) => ({
        id: new Uint8Array(cred.credential_id as Uint8Array),
        type: 'public-key',
        transports: ['internal', 'usb', 'nfc', 'ble', 'hybrid'],
      })) ?? [],
      authenticatorSelection: {
        authenticatorAttachment: undefined,
        requireResidentKey: false,
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -35, -36, -257, -258, -259],
      timeout: 60_000,
    });

    const { error: challengeError } = await supabase
      .from('webauthn_challenges')
      .insert({
        user_id: userId,
        challenge: options.challenge,
        type: 'registration',
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
    console.error('Unexpected error in webauthn-register:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ data: { error: 'Registration failed', details: message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
