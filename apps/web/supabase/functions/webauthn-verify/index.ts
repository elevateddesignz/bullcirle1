import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from 'npm:@simplewebauthn/server@8.3.5';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from 'npm:@simplewebauthn/typescript-types@8.3.5';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

type RegistrationBody = {
  userId: string;
  credential: unknown;
};

type AuthenticationBody = {
  email: string;
  assertion: unknown;
};

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value as number[]);
  }
  if (typeof value === 'string') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Unsupported binary format');
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const preflight = handleCorsPreflight(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if ('credential' in rawBody) {
      const { userId, credential } = rawBody as RegistrationBody;

      if (!userId || !credential) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters for registration' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { data: challengeData, error: challengeError } = await supabase
        .from('webauthn_challenges')
        .select('challenge')
        .eq('user_id', userId)
        .eq('type', 'registration')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (challengeError || !challengeData?.challenge) {
        console.error('Error fetching challenge:', challengeError);
        return new Response(JSON.stringify({ error: 'Challenge not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const registrationResponse = credential as RegistrationResponseJSON;

      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: new URL(supabaseUrl).origin,
        expectedRPID: new URL(supabaseUrl).hostname,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return new Response(JSON.stringify({ error: 'Registration verification failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      const { error: credentialError } = await supabase.from('webauthn_credentials').insert({
        user_id: userId,
        credential_id: credentialID,
        public_key: credentialPublicKey,
        counter: counter ?? 0,
      });

      if (credentialError) {
        console.error('Error storing credential:', credentialError);
        return new Response(JSON.stringify({ error: 'Failed to store credential' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'registration');

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ('assertion' in rawBody) {
      const { email, assertion } = rawBody as AuthenticationBody;

      if (!email || !assertion) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters for authentication' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const authenticationResponse = assertion as AuthenticationResponseJSON;

      const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
          .eq('credential_id', authenticationResponse.id)
          .single(),
      ]);

      if (challengeResult.error || credentialResult.error) {
        console.error('Error fetching challenge or credential:', {
          challengeError: challengeResult.error,
          credentialError: credentialResult.error,
        });
        return new Response(JSON.stringify({ error: 'Invalid challenge or credential' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeResult.data.challenge,
        expectedOrigin: new URL(supabaseUrl).origin,
        expectedRPID: new URL(supabaseUrl).hostname,
        authenticator: {
          credentialPublicKey: credentialResult.data.public_key,
          credentialID: toUint8Array(credentialResult.data.credential_id),
          counter: credentialResult.data.counter,
        },
      });

      if (!verification.verified || !verification.authenticationInfo) {
        return new Response(JSON.stringify({ error: 'Authentication verification failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('webauthn_credentials')
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq('credential_id', authenticationResponse.id);

      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('type', 'authentication');

      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (sessionError) {
        console.error('Error generating session:', sessionError);
        return new Response(JSON.stringify({ error: 'Failed to create session' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: userData.user,
          session: sessionData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid request format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in webauthn-verify:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Verification failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
