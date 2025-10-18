import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

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
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create avatars bucket if it doesn't exist
    const { error } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    // Ignore error if bucket already exists
    if (error && error.message !== 'Bucket already exists') {
      throw error;
    }

    return new Response(
      JSON.stringify({ message: 'Bucket created or already exists' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});