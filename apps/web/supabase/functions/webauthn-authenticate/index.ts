import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@8.3.5';

const allowedHeaders = [
  'Content-Type',
  'Authorization',
  'authorization',
  'apikey',
  'Apikey',
  'x-client-info',
  'X-Client-Info',
  'x-supabase-api-version',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': allowedHeaders.join(', '),
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
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ 
          data: { error: 'Missing email' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ 
          data: { error: 'User not found' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ 
          data: { error: 'User not found' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get user's credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, public_key')
      .eq('user_id', userData.user.id);

    if (credentialsError) {
      console.error('Error fetching credentials:', credentialsError);
      return new Response(
        JSON.stringify({ 
          data: { error: 'Failed to fetch credentials' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ 
          data: { error: 'No credentials found for this user' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate authentication options with enhanced compatibility
    const options = await generateAuthenticationOptions({
      rpID: new URL(supabaseUrl).hostname,
      allowCredentials: credentials.map(c => ({
        id: new Uint8Array(c.credential_id),
        type: 'public-key',
        transports: ['internal', 'usb', 'nfc', 'ble', 'hybrid'], // Support all transport methods
      })),
      userVerification: 'preferred', // Prefer but don't require user verification
      timeout: 60000, // 60 seconds timeout
    });

    // Store challenge
    const { error: challengeError } = await supabase
      .from('webauthn_challenges')
      .insert({
        user_id: userData.user.id,
        challenge: options.challenge,
        type: 'authentication',
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
    console.error('Unexpected error in webauthn-authenticate:', error);
    return new Response(
      JSON.stringify({ 
        data: { 
          error: 'Authentication failed',
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