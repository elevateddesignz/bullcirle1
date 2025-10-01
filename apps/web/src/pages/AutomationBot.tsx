import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Pause, 
  Settings, 
  Zap, 
  Target, 
  Shield, 
  Activity,
  DollarSign,
  Percent,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  ArrowDownUp,
  Brain,
  Search,
  Filter
} from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { useEnvMode } from '../contexts/EnvModeContext';
import { useTheme } from '../contexts/ThemeContext';
import fs from 'fs';
import path from 'path';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface Bot {
  id: string;
  name: string;
  strategy: string;
  status: 'running' | 'paused' | 'stopped';
  mode: 'paper' | 'live';
  equity: number;
  pnl: number;
  winRate: number;
  totalTrades: number;
  symbols: string[];
  riskPercent: number;
  createdAt: string;
  lastTrade?: string;
  performance: { date: string; value: number; pnl: number }[];
  scanSettings?: {
    rsiThreshold: number;
    volumeThreshold: number;
    tradeAmount: number;
    takeProfitPercent: number;
    stopLossPercent: number;
    scanInterval: number;
  };
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  rsi?: number;
  history: { date: string; value: number }[];
}

interface AccountData {
  equity: number;
  buying_power: number;
  cash: number;
  portfolio_value: number;
  day_trade_count: number;
}

interface ScanResult {
  symbol: string;
  price: number;
  volume: number;
  rsi: number;
  action: 'buy' | 'sell' | 'hold';
  timestamp: string;
}

// Helper functions defined at the top
const getStrategyIcon = (strategy: string) => {
  switch(strategy) {
    case 'momentum':
      return <TrendingUp className="w-4 h-4 text-blue-500" />;
    case 'mean_reversion':
      return <ArrowDownUp className="w-4 h-4 text-purple-500" />;
    case 'trend_following':
      return <Activity className="w-4 h-4 text-green-500" />;
    case 'buy_low_sell_high':
      return <DollarSign className="w-4 h-4 text-yellow-500" />;
    case 'reinforcement_learning':
      return <Brain className="w-4 h-4 text-pink-500" />;
    case 'scalping':
      return <Zap className="w-4 h-4 text-orange-500" />;
    default:
      return <Target className="w-4 h-4 text-gray-500" />;
  }
};

const getStrategyDisplayName = (strategy: string) => {
  switch(strategy) {
    case 'momentum':
      return 'Momentum';
    case 'mean_reversion':
      return 'Mean Reversion';
    case 'trend_following':
      return 'Trend Following';
    case 'buy_low_sell_high':
      return 'Buy Low, Sell High';
    case 'reinforcement_learning':
      return 'Reinforcement Learning';
    case 'scalping':
      return 'Scalping';
    default:
      return strategy;
  }
};

export default function AutomationBot() {
  const { envMode } = useEnvMode();
  const { theme } = useTheme();
  const [bots, setBots] = useState<Bot[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [newBotForm, setNewBotForm] = useState({
    name: '',
    strategy: 'momentum',
    symbols: '',
    riskPercent: 2,
    mode: 'paper' as 'paper' | 'live',
    scanSettings: {
      rsiThreshold: 30,
      volumeThreshold: 1000000,
      tradeAmount: 500,
      takeProfitPercent: 5,
      stopLossPercent: 2,
      scanInterval: 60 // minutes
    }
  });

  // References for intervals
  const scanIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  const logFileRef = useRef<string>('auto_trades.log');

  const apiUrl = import.meta.env.VITE_API_URL;

  // Add log entry
  const addLogEntry = (entry: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${entry}`;
    setLogEntries(prev => [logEntry, ...prev]);
    
    // Also write to log file
    try {
      const logPath = path.join(process.cwd(), logFileRef.current);
      fs.appendFileSync(logPath, logEntry + '\n');
    } catch (err) {
      console.error('Error writing to log file:', err);
    }
  };

  // Calculate RSI
  const calculateRSI = (prices: number[], period = 14): number => {
    if (prices.length < period + 1) {
      return 50; // Default value if not enough data
    }
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    let avgGain = 0;
    let avgLoss = 0;
    
    // First RSI calculation
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) {
        avgGain += changes[i];
      } else {
        avgLoss += Math.abs(changes[i]);
      }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // Calculate RSI
    const rs = avgGain / (avgLoss || 1); // Avoid division by zero
    const rsi = 100 - (100 / (1 + rs));
    
    return parseFloat(rsi.toFixed(2));
  };

  // Fetch real account data from Alpaca
  const fetchAccountData = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/account?mode=${envMode}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAccountData(data.account);
      return data.account;
    } catch (err) {
      console.error('Error fetching account data:', err);
      setError('Failed to fetch account data');
      return null;
    }
  };

  // Fetch real market data from Alpha Vantage
  const fetchMarketData = async () => {
    try {
      const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD'];
      const response = await fetch(`${apiUrl}/api/alpha-quotes?symbols=${symbols.join(',')}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const marketDataPromises = symbols.map(async (symbol) => {
        const quote = data.quotes[symbol];
        if (!quote) return null;
        
        // Fetch historical data for each symbol
        const historyResponse = await fetch(`${apiUrl}/api/alpha-history?symbol=${symbol}`);
        const historyData = historyResponse.ok ? await historyResponse.json() : { history: [] };
        
        // Calculate RSI if we have enough history
        const prices = historyData.history?.map((h: any) => h.close) || [];
        const rsi = calculateRSI(prices);
        
        return {
          symbol,
          price: parseFloat(quote['05. price'] || 0),
          change: parseFloat(quote['10. change percent']?.replace('%', '') || 0),
          volume: parseInt(quote['06. volume'] || 0),
          rsi,
          history: historyData.history?.slice(-30).map((h: any) => ({
            date: h.date,
            value: h.close
          })) || []
        };
      });

      const marketResults = await Promise.all(marketDataPromises);
      const validResults = marketResults.filter(Boolean) as MarketData[];
      setMarketData(validResults);
      return validResults;
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market data');
      return [];
    }
  };

  // Fetch portfolio history from Alpaca
  const fetchPortfolioHistory = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/account/history?mode=${envMode}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.history || [];
    } catch (err) {
      console.error('Error fetching portfolio history:', err);
      return [];
    }
  };

  // Create a new bot
  const createBot = async () => {
    if (!newBotForm.name || !newBotForm.symbols) return;

    const newBot: Bot = {
      id: Date.now().toString(),
      name: newBotForm.name,
      strategy: newBotForm.strategy,
      status: 'stopped',
      mode: newBotForm.mode,
      equity: newBotForm.mode === 'paper' ? 100000 : (accountData?.equity || 0),
      pnl: 0,
      winRate: 0,
      totalTrades: 0,
      symbols: newBotForm.symbols.split(',').map(s => s.trim().toUpperCase()),
      riskPercent: newBotForm.riskPercent,
      createdAt: new Date().toISOString(),
      performance: [],
      scanSettings: {
        rsiThreshold: newBotForm.scanSettings.rsiThreshold,
        volumeThreshold: newBotForm.scanSettings.volumeThreshold,
        tradeAmount: newBotForm.scanSettings.tradeAmount,
        takeProfitPercent: newBotForm.scanSettings.takeProfitPercent,
        stopLossPercent: newBotForm.scanSettings.stopLossPercent,
        scanInterval: newBotForm.scanSettings.scanInterval
      }
    };

    setBots(prev => [...prev, newBot]);
    setShowCreateBot(false);
    setNewBotForm({
      name: '',
      strategy: 'momentum',
      symbols: '',
      riskPercent: 2,
      mode: 'paper',
      scanSettings: {
        rsiThreshold: 30,
        volumeThreshold: 1000000,
        tradeAmount: 500,
        takeProfitPercent: 5,
        stopLossPercent: 2,
        scanInterval: 60
      }
    });
    
    addLogEntry(`Created new bot: ${newBot.name} with ${newBot.strategy} strategy`);
  };

  // Start/Stop bot
  const toggleBot = async (botId: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        const newStatus = bot.status === 'running' ? 'paused' : 'running';
        
        // If starting the bot, begin trading simulation and scanning
        if (newStatus === 'running') {
          startBotTrading(bot);
          startStockScanner(bot);
          addLogEntry(`Started bot: ${bot.name}`);
        } else {
          // Clear intervals if stopping
          if (scanIntervals.current[botId]) {
            clearInterval(scanIntervals.current[botId]);
            delete scanIntervals.current[botId];
          }
          addLogEntry(`Paused bot: ${bot.name}`);
        }
        
        return { ...bot, status: newStatus };
      }
      return bot;
    }));
  };

  // Delete bot
  const deleteBot = (botId: string) => {
    // Clear any intervals
    if (scanIntervals.current[botId]) {
      clearInterval(scanIntervals.current[botId]);
      delete scanIntervals.current[botId];
    }
    
    const botToDelete = bots.find(b => b.id === botId);
    if (botToDelete) {
      addLogEntry(`Deleted bot: ${botToDelete.name}`);
    }
    
    setBots(prev => prev.filter(bot => bot.id !== botId));
    if (selectedBot === botId) {
      setSelectedBot(null);
    }
  };

  // Start the stock scanner for a bot
  const startStockScanner = (bot: Bot) => {
    // Clear any existing interval
    if (scanIntervals.current[bot.id]) {
      clearInterval(scanIntervals.current[bot.id]);
    }
    
    // Run initial scan
    runStockScan(bot);
    
    // Set up interval for regular scanning
    const intervalMinutes = bot.scanSettings?.scanInterval || 60;
    scanIntervals.current[bot.id] = setInterval(() => {
      runStockScan(bot);
    }, intervalMinutes * 60 * 1000);
    
    addLogEntry(`Started scanner for bot ${bot.name} - scanning every ${intervalMinutes} minutes`);
  };

  // Run a stock scan
  const runStockScan = async (bot: Bot) => {
    try {
      addLogEntry(`Running stock scan for bot ${bot.name}...`);
      
      // Fetch latest market data
      const latestMarketData = await fetchMarketData();
      
      // Get scan settings
      const settings = bot.scanSettings || {
        rsiThreshold: 30,
        volumeThreshold: 1000000,
        tradeAmount: 500,
        takeProfitPercent: 5,
        stopLossPercent: 2
      };
      
      // Filter stocks based on criteria
      const matchingStocks = latestMarketData.filter(stock => 
        stock.rsi !== undefined && 
        stock.rsi <= settings.rsiThreshold && 
        stock.volume >= settings.volumeThreshold
      );
      
      if (matchingStocks.length === 0) {
        addLogEntry(`No stocks matching criteria found for bot ${bot.name}`);
        return;
      }
      
      // Log matches
      addLogEntry(`Found ${matchingStocks.length} stocks matching criteria for bot ${bot.name}`);
      
      // Check if we have enough funds
      const account = await fetchAccountData();
      if (!account || account.buying_power < settings.tradeAmount) {
        addLogEntry(`Insufficient funds for bot ${bot.name}. Available: $${account?.buying_power || 0}, Required: $${settings.tradeAmount}`);
        return;
      }
      
      // Process each matching stock
      for (const stock of matchingStocks) {
        // Check if we already have a position in this stock
        const hasPosition = await checkExistingPosition(stock.symbol, bot.mode);
        if (hasPosition) {
          addLogEntry(`Already have a position in ${stock.symbol}, skipping`);
          continue;
        }
        
        // Execute trade
        await executeTrade(
          bot, 
          stock.symbol, 
          'buy', 
          settings.tradeAmount, 
          stock.price,
          settings.takeProfitPercent,
          settings.stopLossPercent
        );
        
        // Add to scan results
        const scanResult: ScanResult = {
          symbol: stock.symbol,
          price: stock.price,
          volume: stock.volume,
          rsi: stock.rsi || 0,
          action: 'buy',
          timestamp: new Date().toISOString()
        };
        
        setScanResults(prev => [scanResult, ...prev]);
      }
    } catch (err) {
      console.error('Error running stock scan:', err);
      addLogEntry(`Error in stock scan for bot ${bot.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Check if we already have a position in a stock
  const checkExistingPosition = async (symbol: string, mode: 'paper' | 'live'): Promise<boolean> => {
    try {
      const response = await fetch(`${apiUrl}/api/account?mode=${mode}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      // Check if we have a position in this symbol
      return data.positions.some((pos: any) => pos.symbol === symbol);
    } catch (err) {
      console.error('Error checking positions:', err);
      return false;
    }
  };

  // Simulate bot trading using real market data
  const startBotTrading = async (bot: Bot) => {
    try {
      // Get trading signals for bot's symbols
      const signals = await Promise.all(
        bot.symbols.map(async (symbol) => {
          try {
            const response = await fetch(`${apiUrl}/api/tradingbot/signal?symbol=${symbol}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
          } catch (err) {
            console.error(`Error getting signal for ${symbol}:`, err);
            return null;
          }
        })
      );

      const validSignals = signals.filter(Boolean);
      
      // Execute trades based on signals and strategy
      for (const signal of validSignals) {
        let shouldTrade = false;
        let tradeSide: 'buy' | 'sell' = 'buy';
        
        // Apply different logic based on strategy
        switch(bot.strategy) {
          case 'momentum':
            shouldTrade = signal.confidence > 70 && signal.signal === 'buy';
            tradeSide = 'buy';
            break;
          case 'mean_reversion':
            // For mean reversion, buy when price is low (oversold)
            shouldTrade = signal.confidence > 60 && signal.signal === 'buy';
            tradeSide = 'buy';
            break;
          case 'trend_following':
            // Follow the trend direction
            shouldTrade = signal.confidence > 65;
            tradeSide = signal.signal as 'buy' | 'sell';
            break;
          case 'buy_low_sell_high':
            // Buy when price is significantly below moving average
            const marketInfo = marketData.find(m => m.symbol === signal.symbol);
            if (marketInfo && marketInfo.history.length > 0) {
              const currentPrice = marketInfo.price;
              const avgPrice = marketInfo.history.reduce((sum, h) => sum + h.value, 0) / marketInfo.history.length;
              shouldTrade = currentPrice < avgPrice * 0.95; // 5% below average
              tradeSide = 'buy';
            }
            break;
          case 'reinforcement_learning':
            // Simulate RL decision based on recent performance and market conditions
            shouldTrade = signal.confidence > 60;
            // Dynamically adjust based on recent performance
            const recentPerf = bot.performance.slice(-5);
            const recentWinRate = recentPerf.length > 0 
              ? recentPerf.filter(p => p.pnl > 0).length / recentPerf.length 
              : 0.5;
            
            // If recent performance is good, be more aggressive
            if (recentWinRate > 0.6) {
              shouldTrade = signal.confidence > 50;
            }
            
            tradeSide = signal.signal as 'buy' | 'sell';
            break;
          case 'scalping':
            // Quick in-and-out trades
            shouldTrade = signal.confidence > 75;
            tradeSide = signal.signal as 'buy' | 'sell';
            break;
        }
        
        if (shouldTrade) {
          await executeTrade(
            bot, 
            signal.symbol, 
            tradeSide, 
            bot.scanSettings?.tradeAmount || 500,
            signal.price,
            bot.scanSettings?.takeProfitPercent || 5,
            bot.scanSettings?.stopLossPercent || 2
          );
        }
      }
    } catch (err) {
      console.error('Error in bot trading:', err);
      addLogEntry(`Error in bot trading for ${bot.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Execute a trade for a bot
  const executeTrade = async (
    bot: Bot, 
    symbol: string, 
    side: 'buy' | 'sell', 
    amount: number,
    price: number,
    takeProfitPercent: number,
    stopLossPercent: number
  ) => {
    try {
      // Check if we have enough funds
      const account = await fetchAccountData();
      if (!account || account.buying_power < amount) {
        addLogEntry(`Insufficient funds for ${bot.name} to trade ${symbol}. Available: $${account?.buying_power || 0}, Required: $${amount}`);
        return;
      }
      
      // Calculate quantity based on amount and price
      const quantity = Math.floor(amount / price);
      if (quantity <= 0) {
        addLogEntry(`Calculated quantity for ${symbol} is 0, skipping trade`);
        return;
      }
      
      // Calculate take profit and stop loss prices
      const takeProfit = side === 'buy' 
        ? price * (1 + takeProfitPercent / 100) 
        : price * (1 - takeProfitPercent / 100);
      
      const stopLoss = side === 'buy'
        ? price * (1 - stopLossPercent / 100)
        : price * (1 + stopLossPercent / 100);
      
      if (bot.mode === 'live') {
        // Execute real trade via Alpaca
        const response = await fetch(`${apiUrl}/api/tradingbot/autopilot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            side,
            quantity,
            mode: bot.mode,
            take_profit: takeProfit,
            stop_loss: stopLoss
          })
        });
        
        if (!response.ok) throw new Error(`Trade execution failed: ${response.status}`);
        const result = await response.json();
        
        // Log the trade
        addLogEntry(`EXECUTED ${side.toUpperCase()} for ${symbol} - ${quantity} shares at $${price.toFixed(2)} (Amount: $${amount.toFixed(2)}, TP: $${takeProfit.toFixed(2)}, SL: $${stopLoss.toFixed(2)})`);
        
        // Update bot performance with real trade result
        updateBotPerformance(bot.id, result);
      } else {
        // Simulate paper trade
        const mockPnl = (Math.random() - 0.4) * amount * 0.1; // Slightly positive bias
        
        // Log the trade
        addLogEntry(`PAPER ${side.toUpperCase()} for ${symbol} - ${quantity} shares at $${price.toFixed(2)} (Amount: $${amount.toFixed(2)}, TP: $${takeProfit.toFixed(2)}, SL: $${stopLoss.toFixed(2)})`);
        
        updateBotPerformance(bot.id, { 
          symbol, 
          side, 
          quantity, 
          price, 
          pnl: mockPnl, 
          confidence: 70 
        });
      }
    } catch (err) {
      console.error('Error executing trade:', err);
      addLogEntry(`Error executing trade for ${symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Update bot performance metrics
  const updateBotPerformance = (botId: string, tradeResult: any) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        const newPnl = bot.pnl + (tradeResult.pnl || 0);
        const newTotalTrades = bot.totalTrades + 1;
        const isWin = (tradeResult.pnl || 0) > 0;
        const currentWins = Math.floor(bot.winRate * bot.totalTrades / 100);
        const newWinRate = newTotalTrades > 0 ? ((currentWins + (isWin ? 1 : 0)) / newTotalTrades) * 100 : 0;
        
        const newPerformance = [...bot.performance, {
          date: new Date().toISOString(),
          value: bot.equity + newPnl,
          pnl: tradeResult.pnl || 0
        }].slice(-100); // Keep last 100 data points

        return {
          ...bot,
          pnl: newPnl,
          totalTrades: newTotalTrades,
          winRate: newWinRate,
          lastTrade: new Date().toISOString(),
          performance: newPerformance
        };
      }
      return bot;
    }));
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAccountData(),
        fetchMarketData()
      ]);
      
      // Create log file if it doesn't exist
      try {
        const logPath = path.join(process.cwd(), logFileRef.current);
        if (!fs.existsSync(logPath)) {
          fs.writeFileSync(logPath, `[${new Date().toISOString()}] Auto trading log initialized\n`);
          addLogEntry('Auto trading log initialized');
        } else {
          // Read existing log entries
          const logContent = fs.readFileSync(logPath, 'utf-8');
          const entries = logContent.split('\n').filter(Boolean).reverse();
          setLogEntries(entries);
        }
      } catch (err) {
        console.error('Error with log file:', err);
      }
      
      setIsLoading(false);
    };

    initializeData();

    // Set up real-time updates
    const interval = setInterval(() => {
      fetchAccountData();
      fetchMarketData();
      
      // Update running bots
      bots.filter(bot => bot.status === 'running').forEach(bot => {
        if (Math.random() > 0.7) { // 30% chance to trade each interval
          startBotTrading(bot);
        }
      });
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      // Clear all scan intervals
      Object.values(scanIntervals.current).forEach(clearInterval);
    };
  }, [envMode]);

  // Clean up intervals when component unmounts
  useEffect(() => {
    return () => {
      Object.values(scanIntervals.current).forEach(clearInterval);
    };
  }, []);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme === 'dark' ? '#e5e7eb' : '#374151'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
        grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' }
      },
      y: {
        ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
        grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' }
      }
    }
  };

  // Portfolio performance chart data
  const portfolioChartData = {
    labels: bots[0]?.performance.slice(-30).map(p => new Date(p.date).toLocaleDateString()) || [],
    datasets: [{
      label: 'Portfolio Value',
      data: bots[0]?.performance.slice(-30).map(p => p.value) || [],
      borderColor: '#00FFFF',
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  // Strategy allocation chart data
  const strategyData = bots.reduce((acc, bot) => {
    acc[bot.strategy] = (acc[bot.strategy] || 0) + bot.equity;
    return acc;
  }, {} as Record<string, number>);

  const strategyChartData = {
    labels: Object.keys(strategyData).map(getStrategyDisplayName),
    datasets: [{
      data: Object.values(strategyData),
      backgroundColor: [
        '#00FFFF', '#00BFFF', '#1E90FF', '#4169E1', '#6A5ACD', '#8A2BE2', '#9370DB', '#BA55D3'
      ]
    }]
  };

  // Win rate chart data
  const winRateChartData = {
    labels: bots.map(bot => bot.name),
    datasets: [{
      label: 'Win Rate (%)',
      data: bots.map(bot => bot.winRate),
      backgroundColor: bots.map(bot => bot.winRate > 50 ? '#10B981' : '#EF4444')
    }]
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading automation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-brand-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Automation Bots</h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered trading bots using real market data
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              envMode === 'live' 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              {envMode.toUpperCase()} Mode
            </div>
            <button
              onClick={() => setShowCreateBot(true)}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black font-medium rounded-lg transition-colors"
            >
              Create Bot
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Account Overview */}
        {accountData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Portfolio Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${accountData.portfolio_value.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Buying Power</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${accountData.buying_power.toLocaleString()}
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Day Trades</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {accountData.day_trade_count}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Bots</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {bots.filter(bot => bot.status === 'running').length}
                  </p>
                </div>
                <Bot className="w-8 h-8 text-brand-primary" />
              </div>
            </div>
          </div>
        )}

        {/* Stock Scanner Results */}
        {scanResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Scanner Results
              </h3>
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {scanResults.length} matches
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">RSI</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {scanResults.slice(0, 10).map((result, idx) => (
                    <tr key={`${result.symbol}-${result.timestamp}`} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/30' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-brand-primary">{result.symbol}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${result.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{result.volume.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{result.rsi.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.action === 'buy' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : result.action === 'sell'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {result.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log Entries */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trading Log
            </h3>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {logEntries.length} entries
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {logEntries.length > 0 ? (
              <div className="space-y-1">
                {logEntries.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className={`${
                      entry.includes('EXECUTED') || entry.includes('PAPER')
                        ? 'text-green-600 dark:text-green-400'
                        : entry.includes('Error') || entry.includes('Failed')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">No log entries yet</p>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {bots.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Performance Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Portfolio Performance
              </h3>
              <div className="h-64">
                <Line data={portfolioChartData} options={chartOptions} />
              </div>
            </div>

            {/* Strategy Allocation Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Strategy Allocation
              </h3>
              <div className="h-64">
                <Pie data={strategyChartData} options={chartOptions} />
              </div>
            </div>

            {/* Win Rate Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bot Win Rates
              </h3>
              <div className="h-64">
                <Bar data={winRateChartData} options={chartOptions} />
              </div>
            </div>

            {/* Market Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Market Overview
              </h3>
              <div className="space-y-3">
                {marketData.slice(0, 6).map((market) => (
                  <div key={market.symbol} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {market.symbol}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ${market.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        RSI: {market.rsi?.toFixed(1) || 'N/A'}
                      </span>
                      <div className={`flex items-center space-x-1 ${
                        market.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {market.change >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {market.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-brand-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getStrategyIcon(bot.strategy)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{bot.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getStrategyDisplayName(bot.strategy)}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  bot.status === 'running' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : bot.status === 'paused'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {bot.status}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">P&L</span>
                  <span className={`font-medium ${
                    bot.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    ${bot.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bot.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Trades</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bot.totalTrades}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mode</span>
                  <span className={`font-medium ${
                    bot.mode === 'live' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {bot.mode.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => toggleBot(bot.id)}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                    bot.status === 'running'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}
                >
                  {bot.status === 'running' ? (
                    <>
                      <Pause className="w-4 h-4 inline mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 inline mr-1" />
                      Start
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedBot(selectedBot === bot.id ? null : bot.id)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {selectedBot === bot.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteBot(bot.id)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded Bot Details */}
              {selectedBot === bot.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {bot.performance.length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Performance Chart
                      </h4>
                      <div className="h-32">
                        <Line
                          data={{
                            labels: bot.performance.slice(-10).map(p => new Date(p.date).toLocaleDateString()),
                            datasets: [{
                              label: 'Equity',
                              data: bot.performance.slice(-10).map(p => p.value),
                              borderColor: bot.pnl >= 0 ? '#10B981' : '#EF4444',
                              backgroundColor: `${bot.pnl >= 0 ? '#10B981' : '#EF4444'}20`,
                              fill: true,
                              tension: 0.4
                            }]
                          }}
                          options={{
                            ...chartOptions,
                            plugins: { legend: { display: false } }
                          }}
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Scanner Settings */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Scanner Settings
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">RSI Threshold</span>
                        <span className="text-gray-900 dark:text-white">
                          {bot.scanSettings?.rsiThreshold || 30}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Volume Threshold</span>
                        <span className="text-gray-900 dark:text-white">
                          {(bot.scanSettings?.volumeThreshold || 1000000).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Trade Amount</span>
                        <span className="text-gray-900 dark:text-white">
                          ${(bot.scanSettings?.tradeAmount || 500).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Take Profit</span>
                        <span className="text-gray-900 dark:text-white">
                          {bot.scanSettings?.takeProfitPercent || 5}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Stop Loss</span>
                        <span className="text-gray-900 dark:text-white">
                          {bot.scanSettings?.stopLossPercent || 2}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Scan Interval</span>
                        <span className="text-gray-900 dark:text-white">
                          {bot.scanSettings?.scanInterval || 60} min
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Trading Symbols
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {bot.symbols.map(symbol => (
                        <span 
                          key={symbol}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {bot.lastTrade && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Last Trade
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(bot.lastTrade).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Bot Modal */}
        {showCreateBot && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Bot</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    value={newBotForm.name}
                    onChange={(e) => setNewBotForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., RSI Scanner Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strategy
                  </label>
                  <select
                    value={newBotForm.strategy}
                    onChange={(e) => setNewBotForm(prev => ({ ...prev, strategy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="momentum">Momentum</option>
                    <option value="mean_reversion">Mean Reversion</option>
                    <option value="trend_following">Trend Following</option>
                    <option value="buy_low_sell_high">Buy Low, Sell High</option>
                    <option value="reinforcement_learning">Reinforcement Learning</option>
                    <option value="scalping">Scalping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Symbols (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newBotForm.symbols}
                    onChange={(e) => setNewBotForm(prev => ({ ...prev, symbols: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="AAPL, TSLA, MSFT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={newBotForm.riskPercent}
                    onChange={(e) => setNewBotForm(prev => ({ ...prev, riskPercent: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trading Mode
                  </label>
                  <select
                    value={newBotForm.mode}
                    onChange={(e) => setNewBotForm(prev => ({ ...prev, mode: e.target.value as 'paper' | 'live' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="paper">Paper Trading</option>
                    <option value="live">Live Trading</option>
                  </select>
                </div>

                {/* Scanner Settings */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Scanner Settings
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        RSI Threshold (Buy below)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newBotForm.scanSettings.rsiThreshold}
                        onChange={(e) => setNewBotForm(prev => ({ 
                          ...prev, 
                          scanSettings: {
                            ...prev.scanSettings,
                            rsiThreshold: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Volume Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100000"
                        value={newBotForm.scanSettings.volumeThreshold}
                        onChange={(e) => setNewBotForm(prev => ({ 
                          ...prev, 
                          scanSettings: {
                            ...prev.scanSettings,
                            volumeThreshold: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trade Amount ($)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="100"
                        value={newBotForm.scanSettings.tradeAmount}
                        onChange={(e) => setNewBotForm(prev => ({ 
                          ...prev, 
                          scanSettings: {
                            ...prev.scanSettings,
                            tradeAmount: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Take Profit (%)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={newBotForm.scanSettings.takeProfitPercent}
                          onChange={(e) => setNewBotForm(prev => ({ 
                            ...prev, 
                            scanSettings: {
                              ...prev.scanSettings,
                              takeProfitPercent: parseFloat(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Stop Loss (%)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={newBotForm.scanSettings.stopLossPercent}
                          onChange={(e) => setNewBotForm(prev => ({ 
                            ...prev, 
                            scanSettings: {
                              ...prev.scanSettings,
                              stopLossPercent: parseFloat(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scan Interval (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={newBotForm.scanSettings.scanInterval}
                        onChange={(e) => setNewBotForm(prev => ({ 
                          ...prev, 
                          scanSettings: {
                            ...prev.scanSettings,
                            scanInterval: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateBot(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createBot}
                  disabled={!newBotForm.name || !newBotForm.symbols}
                  className="flex-1 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
                >
                  Create Bot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Strategy Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trading Strategies
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Momentum</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Buys assets showing strong upward price movement, aiming to capitalize on continuation of the trend.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowDownUp className="w-4 h-4 text-purple-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Mean Reversion</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Buys oversold assets and sells overbought assets, expecting prices to return to their average.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-green-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Trend Following</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Identifies and follows established market trends, entering and exiting positions based on trend strength.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Buy Low, Sell High</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Identifies assets trading below their historical average and buys them, selling when they rise above average.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="w-4 h-4 text-pink-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Reinforcement Learning</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uses AI to learn optimal trading strategies through trial and error, adapting to changing market conditions.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Scalping</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Makes numerous small trades to capture small price movements, focusing on high-frequency, short-term opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}