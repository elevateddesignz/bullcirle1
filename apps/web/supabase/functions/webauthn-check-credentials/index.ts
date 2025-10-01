import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

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
          data: { hasCredentials: false }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ 
          data: { hasCredentials: false }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if user has any credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', userData.user.id)
      .limit(1);

    if (credentialsError) {
      console.error('Error checking credentials:', credentialsError);
      return new Response(
        JSON.stringify({ 
          data: { hasCredentials: false }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        data: { hasCredentials: credentials && credentials.length > 0 }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unexpected error in webauthn-check-credentials:', error);
    return new Response(
      JSON.stringify({ 
        data: { 
          error: 'Internal server error',
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