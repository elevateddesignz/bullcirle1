import OpenAI from 'npm:openai@4.28.0';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

function formatMarketData(marketData: unknown): string {
  if (!marketData || typeof marketData !== 'object') {
    return 'No market data provided';
  }

  try {
    const entries = Object.entries(marketData as Record<string, unknown>)
      .map(([symbol, data]) => `${symbol}: ${JSON.stringify(data)}`);
    return entries.join('\n');
  } catch {
    return 'Unable to format market data';
  }
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
    const { symbols, marketData } = await req.json().catch(() => ({}));

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'Symbols array is required' }), {
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
You are an expert trading algorithm. Analyze the following market data for these symbols: ${symbols.join(', ')}

${formatMarketData(marketData)}

Based on this data, identify the best trading opportunity among these symbols. Provide your recommendation in the following JSON format:
{
  "symbol": "string",
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
    console.error('Error in strategy-search function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
