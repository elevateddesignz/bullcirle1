import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import OpenAI from 'npm:openai@4.28.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { symbols, marketData } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: "Symbols array is required" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    if (!openai.apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500,
        }
      );
    }

    // Format market data for analysis
    const formattedData = formatMarketData(marketData || {});

    // Create prompt for OpenAI
    const prompt = `
You are an expert trading algorithm. Analyze the following market data for these symbols: ${symbols.join(', ')}

${formattedData}

Based on this data, identify the best trading opportunity among these symbols. Provide your recommendation in the following JSON format:
{
  "symbol": "string", // The best symbol to trade
  "strategy": "string", // Name of the strategy (e.g., "Momentum", "Mean Reversion", "Trend Following")
  "recommendation": "string", // Must be one of: "buy", "sell", "hold"
  "confidence": number, // 0-100 confidence score
  "analysis": "string", // Brief explanation of the analysis (max 200 chars)
  "stopLoss": number, // Recommended stop loss percentage (e.g., 0.02 for 2%)
  "takeProfit": number // Recommended take profit percentage (e.g., 0.05 for 5%)
}

Only respond with valid JSON. No other text.
`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    // Parse the response
    const content = response.choices[0].message.content?.trim() || "{}";
    let result;
    
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse strategy recommendation" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in strategy-search function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});

function formatMarketData(marketData: any): string {
  if (typeof marketData !== 'object' || marketData === null) {
    return "No market data provided";
  }
  
  let result = "";
  
  // Handle different data formats
  if (Array.isArray(marketData)) {
    // Array of objects (e.g., multiple symbols or time series)
    result = marketData.map(item => {
      if (typeof item === 'object' && item !== null) {
        const symbol = item.symbol || "Unknown";
        const price = item.price || item.close || item.value || "N/A";
        const change = item.change || item.changePercent || "N/A";
        
        return `Symbol: ${symbol}, Price: ${price}, Change: ${change}`;
      }
      return String(item);
    }).join('\n');
  } else {
    // Single object with properties
    result = Object.entries(marketData)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
  }
  
  return result || "No market data available";
}