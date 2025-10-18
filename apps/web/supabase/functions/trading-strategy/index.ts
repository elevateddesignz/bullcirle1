import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import OpenAI from 'npm:openai@4.28.0';

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
    const { symbol, marketData } = await req.json();

    if (!symbol || !marketData) {
      return new Response(
        JSON.stringify({ error: "Symbol and market data are required" }),
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
    const formattedData = formatMarketData(marketData);

    // Create prompt for OpenAI
    const prompt = `
You are an expert trading algorithm. Analyze the following market data for ${symbol}:

${formattedData}

Based on this data, provide a trading recommendation in the following JSON format:
{
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
    console.error("Error in trading-strategy function:", error);
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
  if (Array.isArray(marketData)) {
    // Format time series data
    return marketData.map((dataPoint, index) => {
      const date = dataPoint.date || dataPoint.timestamp || `Day ${index + 1}`;
      const open = dataPoint.open || dataPoint.o || 'N/A';
      const high = dataPoint.high || dataPoint.h || 'N/A';
      const low = dataPoint.low || dataPoint.l || 'N/A';
      const close = dataPoint.close || dataPoint.c || dataPoint.value || 'N/A';
      const volume = dataPoint.volume || dataPoint.v || 'N/A';
      
      return `Date: ${date}, Open: ${open}, High: ${high}, Low: ${low}, Close: ${close}, Volume: ${volume}`;
    }).join('\n');
  } else {
    // Format object data
    return Object.entries(marketData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
}