import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const preflight = handleCorsPreflight(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { symbol, side, quantity, stopLoss, takeProfit, mode } = body;

    if (!symbol || !side || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Symbol, side, and quantity are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!['buy', 'sell'].includes(side)) {
      return new Response(
        JSON.stringify({ error: "Side must be 'buy' or 'sell'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const tradeMode = mode === 'live' ? 'live' : 'paper';
    const apiKeyId = tradeMode === 'live'
      ? Deno.env.get('ALPACA_LIVE_API_KEY')
      : Deno.env.get('ALPACA_PAPER_API_KEY');
    const apiSecretKey = tradeMode === 'live'
      ? Deno.env.get('ALPACA_LIVE_API_SECRET')
      : Deno.env.get('ALPACA_PAPER_API_SECRET');
    const baseUrl = tradeMode === 'live'
      ? 'https://api.alpaca.markets'
      : 'https://paper-api.alpaca.markets';

    if (!apiKeyId || !apiSecretKey) {
      return new Response(
        JSON.stringify({ error: `Alpaca ${tradeMode} API credentials not configured` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const orderPayload = {
      symbol,
      qty: quantity,
      side,
      type: 'market',
      time_in_force: 'gtc',
    };

    const response = await fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error: ${response.status} - ${errorText}`);
    }

    const orderResult = await response.json();

    if ((stopLoss || takeProfit) && orderResult.id) {
      // TODO: Create bracket orders tied to this trade when backend support is ready.
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('trades').insert({
          user_id: user.id,
          symbol,
          type: side,
          shares: quantity,
          price: orderResult.filled_avg_price || orderResult.limit_price || 0,
          status: orderResult.status || 'pending',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: orderResult,
        message: `${side.toUpperCase()} order for ${quantity} shares of ${symbol} executed successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in execute-trade function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
