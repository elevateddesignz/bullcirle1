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
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store email in the database
    const { error: dbError } = await supabaseClient
      .from('waitlist')
      .insert([{ email }]);

    if (dbError) {
      throw dbError;
    }

    // Send notification email using Supabase's built-in SMTP
    const { error: emailError } = await supabaseClient
      .from('emails')
      .insert([{
        to: 'contact@bullcircle.com',
        subject: 'New Waitlist Signup',
        content: `New signup from: ${email}`,
      }]);

    if (emailError) {
      throw emailError;
    }

    return new Response(
      JSON.stringify({ message: 'Successfully added to waitlist' }),
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