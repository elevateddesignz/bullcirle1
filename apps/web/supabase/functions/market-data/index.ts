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
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    const interval = url.searchParams.get('interval') || 'daily';

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol parameter is required" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        }
      );
    }

    // Get Alpha Vantage API key from environment
    const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Alpha Vantage API key not configured" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500,
        }
      );
    }

    // Determine the function to call based on interval
    let timeSeriesFunction = 'TIME_SERIES_DAILY';
    if (interval === 'weekly') {
      timeSeriesFunction = 'TIME_SERIES_WEEKLY';
    } else if (interval === 'monthly') {
      timeSeriesFunction = 'TIME_SERIES_MONTHLY';
    } else if (interval === 'intraday') {
      timeSeriesFunction = 'TIME_SERIES_INTRADAY';
    }

    // Build Alpha Vantage API URL
    let alphaVantageUrl = `https://www.alphavantage.co/query?function=${timeSeriesFunction}&symbol=${symbol}&apikey=${apiKey}`;
    
    // Add additional parameters for intraday
    if (interval === 'intraday') {
      alphaVantageUrl += '&interval=5min&outputsize=compact';
    }

    // Fetch data from Alpha Vantage
    const response = await fetch(alphaVantageUrl);
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract and format the time series data
    let timeSeriesKey = '';
    if (interval === 'daily') {
      timeSeriesKey = 'Time Series (Daily)';
    } else if (interval === 'weekly') {
      timeSeriesKey = 'Weekly Time Series';
    } else if (interval === 'monthly') {
      timeSeriesKey = 'Monthly Time Series';
    } else if (interval === 'intraday') {
      timeSeriesKey = 'Time Series (5min)';
    }

    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      return new Response(
        JSON.stringify({ error: "No data available for this symbol" }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 404,
        }
      );
    }

    // Convert time series to array format
    const formattedData = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'] || '0', 10)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return new Response(
      JSON.stringify({ symbol, interval, data: formattedData }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in market-data function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});