import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from 'npm:@simplewebauthn/server@8.3.5';

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
          error: 'Server configuration error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (body.credential) {
      // Handle registration verification
      const { userId, credential } = body;

      if (!userId || !credential) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters for registration' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Get stored challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from('webauthn_challenges')
        .select('challenge')
        .eq('user_id', userId)
        .eq('type', 'registration')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (challengeError) {
        console.error('Error fetching challenge:', challengeError);
        return new Response(
          JSON.stringify({ error: 'Challenge not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Verify registration
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: new URL(supabaseUrl).origin,
        expectedRPID: new URL(supabaseUrl).hostname,
      });

      if (!verification.verified) {
        return new Response(
          JSON.stringify({ error: 'Registration verification failed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Store credential
      const { error: credentialError } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: userId,
          credential_id: credential.id,
          public_key: verification.registrationInfo?.credentialPublicKey,
          counter: verification.registrationInfo?.counter ?? 0,
        });

      if (credentialError) {
        console.error('Error storing credential:', credentialError);
        return new Response(
          JSON.stringify({ error: 'Failed to store credential' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Clean up used challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'registration');

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else if (body.assertion) {
      // Handle authentication verification
      const { email, assertion } = body;

      if (!email || !assertion) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters for authentication' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Get user by email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
      
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Get stored challenge and credential
      const [challengeResult, credentialResult] = await Promise.all([
        supabase
          .from('webauthn_challenges')
          .select('challenge')
          .eq('user_id', userData.user.id)
          .eq('type', 'authentication')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('webauthn_credentials')
          .select('*')
          .eq('credential_id', assertion.id)
          .single(),
      ]);

      if (challengeResult.error || credentialResult.error) {
        console.error('Error fetching challenge or credential:', {
          challengeError: challengeResult.error,
          credentialError: credentialResult.error
        });
        return new Response(
          JSON.stringify({ error: 'Invalid challenge or credential' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Verify authentication
      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challengeResult.data.challenge,
        expectedOrigin: new URL(supabaseUrl).origin,
        expectedRPID: new URL(supabaseUrl).hostname,
        authenticator: {
          credentialPublicKey: credentialResult.data.public_key,
          credentialID: new Uint8Array(credentialResult.data.credential_id),
          counter: credentialResult.data.counter,
        },
      });

      if (!verification.verified) {
        return new Response(
          JSON.stringify({ error: 'Authentication verification failed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Update credential counter
      await supabase
        .from('webauthn_credentials')
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq('credential_id', assertion.id);

      // Clean up used challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('type', 'authentication');

      // Generate session token for the user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (sessionError) {
        console.error('Error generating session:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          user: userData.user,
          session: sessionData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error) {
    console.error('Unexpected error in webauthn-verify:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Verification failed',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});