import { supabase } from './supabaseClient';
import axios from 'axios';
import { fetchMarketData, fetchQuote, fetchMarketMovers } from './alphaVantage';

/**
 * Gets a trading strategy recommendation from the backend API
 * @param symbol Stock symbol
 * @returns Strategy recommendation
 */
export async function getStrategyRecommendation(symbol: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/tradingbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting strategy recommendation:', error);
    throw error;
  }
}

/**
 * Executes a trade through the backend API
 * @param symbol Stock symbol
 * @param side Buy or sell
 * @param quantity Number of shares
 * @param mode Paper or live trading
 * @returns Trade execution result
 */
export async function executeTrade(
  symbol: string,
  side: 'buy' | 'sell',
  quantity: number,
  mode: 'paper' | 'live' = 'paper'
) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/tradingbot/autopilot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        side,
        quantity,
        mode
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing trade:', error);
    throw error;
  }
}

/**
 * Analyzes a stock and provides a trading recommendation
 * @param symbol Stock symbol
 * @returns Analysis result
 */
export async function analyzeStock(symbol: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    // Get trading signal from backend
    const response = await fetch(`${apiUrl}/api/tradingbot/signal?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      symbol: data.symbol,
      price: data.price,
      change: 0, // Backend doesn't provide change, set to 0
      strategy: {
        strategy: data.reason || 'Technical Analysis',
        recommendation: data.signal || 'hold',
        confidence: data.confidence || 50,
        analysis: data.reason || 'No analysis available',
        stopLoss: 2.0, // Default 2% stop loss
        takeProfit: 4.0 // Default 4% take profit
      }
    };
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error);
    throw error;
  }
}

/**
 * Gets account information from the backend API
 * @param mode Paper or live trading mode
 * @returns Account data
 */
export async function getAccountInfo(mode: 'paper' | 'live' = 'paper') {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/account?mode=${mode}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching account info:', error);
    throw error;
  }
}

/**
 * Gets watchlist symbols from the database
 * @returns Array of watchlist symbols
 */
export async function getWatchlistSymbols() {
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('symbol');
      
    if (error) throw error;
    
    return data?.map(item => item.symbol) || [];
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN']; // Default symbols
  }
}

/**
 * Searches for the best trading opportunities based on market data
 * @returns Array of trading opportunities
 */
export async function findTradingOpportunities() {
  try {
    // Get market movers
    const { gainers, losers } = await fetchMarketMovers('stocks');
    
    // Combine and get top 10 symbols by absolute change
    const allSymbols = [...gainers, ...losers]
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10)
      .map(item => item.symbol);
    
    // Analyze each symbol
    const opportunities = await Promise.all(
      allSymbols.map(async (symbol) => {
        try {
          const analysis = await analyzeStock(symbol);
          return analysis;
        } catch (error) {
          console.error(`Error analyzing ${symbol}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed analyses and sort by confidence
    return opportunities
      .filter(Boolean)
      .sort((a, b) => (b?.strategy?.confidence || 0) - (a?.strategy?.confidence || 0));
  } catch (error) {
    console.error('Error finding trading opportunities:', error);
    throw error;
  }
}

/**
 * Runs the trading bot with the specified parameters
 * @param targetProfit Target profit amount
 * @param stopLossPct Stop loss percentage
 * @param takeProfitPct Take profit percentage
 * @param mode Paper or live trading
 * @returns Bot execution result
 */
export async function runTradingBot(
  targetProfit: number,
  stopLossPct: number,
  takeProfitPct: number,
  mode: 'paper' | 'live' = 'paper'
) {
  try {
    // Get account information from backend API
    const accountData = await getAccountInfo(mode);
    
    // Find trading opportunities
    const opportunities = await findTradingOpportunities();
    
    // Execute trades for high-confidence signals
    const executedTrades = [];
    for (const analysis of opportunities) {
      if (
        analysis?.strategy?.recommendation &&
        ['buy', 'sell'].includes(analysis.strategy.recommendation) &&
        analysis.strategy?.confidence >= 70 &&
        executedTrades.length < 3 // Limit to 3 trades per run
      ) {
        const side = analysis.strategy.recommendation as 'buy' | 'sell';
        const quantity = Math.max(1, Math.floor(targetProfit / analysis.price));
        
        try {
          const tradeResult = await executeTrade(
            analysis.symbol,
            side,
            quantity,
            mode
          );
          
          executedTrades.push({
            symbol: analysis.symbol,
            side,
            quantity,
            price: analysis.price,
            strategy: analysis.strategy.strategy,
            confidence: analysis.strategy.confidence,
            result: tradeResult
          });
        } catch (error) {
          console.error(`Error executing trade for ${analysis.symbol}:`, error);
        }
      }
    }
    
    return {
      analyzed: opportunities.length,
      topPicks: opportunities.slice(0, 5),
      executedTrades,
      accountData
    };
  } catch (error) {
    console.error('Error running trading bot:', error);
    throw error;
  }
}

/**
 * Automatically searches for the best strategy based on market conditions
 * @param mode Paper or live trading mode
 * @returns Best strategy recommendation
 */
export async function findBestStrategy(mode: 'paper' | 'live' = 'paper') {
  try {
    // Get market movers
    const { gainers } = await fetchMarketMovers('stocks');
    
    // Get top 5 gainers
    const topGainers = gainers.slice(0, 5);
    
    // Analyze each gainer
    const analyses = await Promise.all(
      topGainers.map(async (gainer) => {
        try {
          const analysis = await analyzeStock(gainer.symbol);
          return {
            ...analysis,
            change: gainer.change
          };
        } catch (error) {
          console.error(`Error analyzing ${gainer.symbol}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed analyses and sort by confidence
    const validAnalyses = analyses
      .filter(Boolean)
      .sort((a, b) => (b?.strategy?.confidence || 0) - (a?.strategy?.confidence || 0));
    
    // Return the best strategy
    return validAnalyses[0] || null;
  } catch (error) {
    console.error('Error finding best strategy:', error);
    throw error;
  }
}