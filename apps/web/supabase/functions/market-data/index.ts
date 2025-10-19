import { buildCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const TIME_SERIES_FUNCTIONS = {
  daily: 'TIME_SERIES_DAILY',
  weekly: 'TIME_SERIES_WEEKLY',
  monthly: 'TIME_SERIES_MONTHLY',
  intraday: 'TIME_SERIES_INTRADAY',
} as const;

const TIME_SERIES_KEYS = {
  daily: 'Time Series (Daily)',
  weekly: 'Weekly Time Series',
  monthly: 'Monthly Time Series',
  intraday: 'Time Series (5min)',
} as const;

type Interval = keyof typeof TIME_SERIES_FUNCTIONS;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const preflight = handleCorsPreflight(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    const interval = (url.searchParams.get('interval') ?? 'daily') as Interval;

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const intervalKey = TIME_SERIES_FUNCTIONS[interval] ? interval : 'daily';
    const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Alpha Vantage API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams({
      function: TIME_SERIES_FUNCTIONS[intervalKey],
      symbol,
      apikey: apiKey,
    });

    if (intervalKey === 'intraday') {
      params.set('interval', '5min');
      params.set('outputsize', 'compact');
    }

    const response = await fetch(`https://www.alphavantage.co/query?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    const timeSeriesKey = TIME_SERIES_KEYS[intervalKey];
    const timeSeries = data[timeSeriesKey] as Record<string, Record<string, string>> | undefined;

    if (!timeSeries) {
      return new Response(JSON.stringify({ error: 'No data available for this symbol' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedData = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        open: Number.parseFloat(values['1. open'] ?? '0'),
        high: Number.parseFloat(values['2. high'] ?? '0'),
        low: Number.parseFloat(values['3. low'] ?? '0'),
        close: Number.parseFloat(values['4. close'] ?? '0'),
        volume: Number.parseInt(values['5. volume'] ?? '0', 10),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return new Response(JSON.stringify({ symbol, interval: intervalKey, data: formattedData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in market-data function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
