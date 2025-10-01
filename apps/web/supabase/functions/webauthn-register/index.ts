import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@8.3.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ 
          data: { error: 'Server configuration error' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { userId, email } = body;

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ 
          data: { error: 'Missing required parameters' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing credentials
    const { data: existingCreds } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId);

    // Generate registration options with enhanced compatibility
    const options = await generateRegistrationOptions({
      rpName: 'Bull Circle',
      rpID: new URL(supabaseUrl).hostname,
      userID: userId,
      userName: email,
      userDisplayName: email.split('@')[0],
      attestationType: 'none', // Don't require attestation for better compatibility
      excludeCredentials: existingCreds?.map(cred => ({
        id: new Uint8Array(cred.credential_id),
        type: 'public-key',
        transports: ['internal', 'usb', 'nfc', 'ble', 'hybrid'],
      })) || [],
      authenticatorSelection: {
        // Allow both platform and cross-platform authenticators
        authenticatorAttachment: undefined,
        requireResidentKey: false,
        residentKey: 'preferred',
        userVerification: 'preferred', // Prefer but don't require user verification
      },
      supportedAlgorithmIDs: [-7, -35, -36, -257, -258, -259], // Support multiple algorithms
      timeout: 60000, // 60 seconds timeout
    });

    // Store challenge in database
    const { error: challengeError } = await supabase
      .from('webauthn_challenges')
      .insert({
        user_id: userId,
        challenge: options.challenge,
        type: 'registration',
      });

    if (challengeError) {
      console.error('Error storing challenge:', challengeError);
      return new Response(
        JSON.stringify({ 
          data: { error: 'Failed to store challenge' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        data: { challenge: options }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unexpected error in webauthn-register:', error);
    return new Response(
      JSON.stringify({ 
        data: { 
          error: 'Registration failed',
          details: error instanceof Error ? error.message : String(error)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});