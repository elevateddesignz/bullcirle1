import OpenAI from 'npm:openai@4.28.0';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

function formatMarketData(marketData: unknown): string {
  if (Array.isArray(marketData)) {
    return marketData
      .map((point, index) => {
        if (!point || typeof point !== 'object') {
          return `Entry ${index + 1}: unavailable`;
        }
        const record = point as Record<string, unknown>;
        const date = record.date ?? record.timestamp ?? `Day ${index + 1}`;
        const open = record.open ?? record.o ?? 'N/A';
        const high = record.high ?? record.h ?? 'N/A';
        const low = record.low ?? record.l ?? 'N/A';
        const close = record.close ?? record.c ?? record.value ?? 'N/A';
        const volume = record.volume ?? record.v ?? 'N/A';
        return `Date: ${date}, Open: ${open}, High: ${high}, Low: ${low}, Close: ${close}, Volume: ${volume}`;
      })
      .join('\n');
  }

  if (marketData && typeof marketData === 'object') {
    return Object.entries(marketData as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  return 'No market data provided';
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
    const { symbol, marketData } = await req.json().catch(() => ({}));

    if (!symbol || !marketData) {
      return new Response(JSON.stringify({ error: 'Symbol and market data are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
You are an expert trading algorithm. Analyze the following market data for ${symbol}:

${formatMarketData(marketData)}

Based on this data, provide a trading recommendation in the following JSON format:
{
  "strategy": "string",
  "recommendation": "string",
  "confidence": number,
  "analysis": "string",
  "stopLoss": number,
  "takeProfit": number
}

Only respond with valid JSON. No other text.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content?.trim() ?? '{}';

    try {
      const result = JSON.parse(content);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse strategy recommendation' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('Error in trading-strategy function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
