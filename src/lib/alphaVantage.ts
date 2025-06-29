import axios from 'axios';

/**
 * Fetches historical market data for a symbol from Alpha Vantage
 * @param symbol Stock symbol (e.g., AAPL)
 * @param interval Time interval (e.g., daily, weekly)
 * @returns Formatted market data
 */
export async function fetchMarketData(symbol: string, interval: string = 'daily') {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await axios.get(`${apiUrl}/api/alpha-history?symbol=${symbol}`);
    
    if (response.data && response.data.history) {
      return response.data.history;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetches current quote data for a symbol from Alpha Vantage
 * @param symbol Stock symbol (e.g., AAPL)
 * @returns Current quote data
 */
export async function fetchQuote(symbol: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await axios.get(`${apiUrl}/api/alpha-quotes?symbols=${symbol}`);
    
    if (response.data && response.data.quotes && response.data.quotes[symbol]) {
      return response.data.quotes[symbol];
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Searches for symbols matching a query
 * @param query Search query
 * @returns Array of matching symbols
 */
export async function searchSymbols(query: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await axios.get(`${apiUrl}/api/alpha-search?query=${encodeURIComponent(query)}`);
    
    if (response.data && response.data.results) {
      return response.data.results;
    }
    
    return [];
  } catch (error) {
    console.error(`Error searching symbols for "${query}":`, error);
    return [];
  }
}

/**
 * Fetches top market movers (gainers and losers)
 * @param market Market type (stocks or crypto)
 * @returns Object containing gainers and losers
 */
export async function fetchMarketMovers(market: 'stocks' | 'crypto' = 'stocks') {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    // Try the new endpoint first, fallback to topplays if not available
    let response;
    try {
      response = await axios.get(`${apiUrl}/api/tradingbot/plays?market=${market}&limit=10`);
    } catch (error) {
      // Fallback to topplays endpoint
      response = await axios.get(`${apiUrl}/api/tradingbot/topplays?market=${market}&limit=10`);
    }
    
    if (response.data) {
      // Handle both response formats
      if (response.data.gainers && response.data.losers) {
        return {
          gainers: response.data.gainers || [],
          losers: response.data.losers || []
        };
      } else if (response.data.plays) {
        // topplays format
        return {
          gainers: response.data.plays || [],
          losers: []
        };
      }
    }
    
    return { gainers: [], losers: [] };
  } catch (error) {
    console.error(`Error fetching market movers for ${market}:`, error);
    
    // Return mock data as fallback
    const mockGainers = [
      { symbol: 'AAPL', price: 150.25, change: 2.5 },
      { symbol: 'MSFT', price: 280.75, change: 1.8 },
      { symbol: 'GOOGL', price: 2650.50, change: 3.2 },
      { symbol: 'TSLA', price: 850.00, change: 4.1 },
      { symbol: 'AMZN', price: 3200.25, change: 1.9 }
    ];
    
    const mockLosers = [
      { symbol: 'FB', price: 320.75, change: -1.2 },
      { symbol: 'NFLX', price: 550.50, change: -2.3 },
      { symbol: 'INTC', price: 55.25, change: -1.8 },
      { symbol: 'BABA', price: 180.00, change: -3.5 },
      { symbol: 'DIS', price: 175.50, change: -0.9 }
    ];
    
    return { gainers: mockGainers, losers: mockLosers };
  }
}

/**
 * Fetches market news from Alpha Vantage
 * @param symbols Optional array of symbols to filter news
 * @returns Array of news articles
 */
export async function fetchMarketNews(symbols?: string[]) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await axios.get(`${apiUrl}/api/alpha-news`);
    
    if (response.data && response.data.news) {
      let news = response.data.news;
      
      // Filter by symbols if provided
      if (symbols && symbols.length > 0) {
        news = news.filter((article: any) => 
          symbols.some(symbol => 
            article.title.includes(symbol) || 
            article.summary.includes(symbol)
          )
        );
      }
      
      return news;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching market news:', error);
    return [];
  }
}

/**
 * Fetches all available stock symbols
 * @returns Array of stock symbols
 */
export async function fetchAllSymbols() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await axios.get(`${apiUrl}/api/tradingbot/symbols`);
    
    if (response.data && response.data.symbols) {
      return response.data.symbols;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching all symbols:', error);
    return [];
  }
}