import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const allowedHeaders = [
  "Content-Type",
  "Authorization",
  "authorization",
  "apikey",
  "Apikey",
  "x-client-info",
  "X-Client-Info",
  "x-supabase-api-version",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": allowedHeaders.join(", "),
      headers: corsHeaders,
    });
  }

  try {
    const { symbol, side, quantity, stopLoss, takeProfit, mode } = await req.json();

    if (!symbol || !side || !quantity) {
      return new Response(
        JSON.stringify({ error: "Symbol, side, and quantity are required" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        }
      );
    }

    // Validate side
    if (side !== 'buy' && side !== 'sell') {
      return new Response(
        JSON.stringify({ error: "Side must be 'buy' or 'sell'" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        }
      );
    }

    // Validate mode
    const tradeMode = mode === 'live' ? 'live' : 'paper';
    
    // Get Alpaca API credentials based on mode
    const apiKeyId = tradeMode === 'live' 
      ? Deno.env.get("ALPACA_LIVE_API_KEY") 
      : Deno.env.get("ALPACA_PAPER_API_KEY");
      
    const apiSecretKey = tradeMode === 'live'
      ? Deno.env.get("ALPACA_LIVE_API_SECRET")
      : Deno.env.get("ALPACA_PAPER_API_SECRET");
      
    const baseUrl = tradeMode === 'live'
      ? "https://api.alpaca.markets"
      : "https://paper-api.alpaca.markets";

    if (!apiKeyId || !apiSecretKey) {
      return new Response(
        JSON.stringify({ error: `Alpaca ${tradeMode} API credentials not configured` }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500,
        }
      );
    }

    // Create order payload
    const orderPayload = {
      symbol,
      qty: quantity,
      side,
      type: 'market',
      time_in_force: 'gtc',
    };

    // Execute the order
    const response = await fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error: ${response.status} - ${errorText}`);
    }

    const orderResult = await response.json();

    // If stop loss and take profit are provided, create bracket orders
    if ((stopLoss || takeProfit) && orderResult.id) {
      // Implementation for stop loss and take profit would go here
      // This would involve creating additional orders that are linked to the original order
    }

    // Log the trade in the database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('trades').insert({
        user_id: user.id,
        symbol,
        type: side,
        shares: quantity,
        price: orderResult.filled_avg_price || orderResult.limit_price || 0,
        status: orderResult.status || 'pending'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: orderResult,
        message: `${side.toUpperCase()} order for ${quantity} shares of ${symbol} executed successfully`
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in execute-trade function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});