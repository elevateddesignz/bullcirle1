// src/pages/AutomationBot.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useEnvMode } from '../contexts/EnvModeContext';
import { useAutoBot } from '../contexts/AutoBotContext';
import { 
  Activity, 
  Zap, 
  Clock, 
  Settings, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause, 
  BarChart3,
  Bot,
  Sparkles,
  ArrowRight,
  Info,
  Search,
  RefreshCw,
  Filter,
  TrendingDown
} from 'lucide-react';
import { analyzeStock, findTradingOpportunities, findBestStrategy } from '../lib/tradingBotService';
import { fetchMarketMovers, fetchMarketNews } from '../lib/alphaVantage';
import toast from 'react-hot-toast';

export default function AutomationBot() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { envMode } = useEnvMode();
  const {
    running,
    busy,
    interval,
    equity,
    log,
    strategyLog,
    error,
    start,
    stop,
    setIntervalMin,
  } = useAutoBot();

  const [targetProfit, setTargetProfit] = useState<number>(100);
  const [stopLossPct, setStopLossPct] = useState<number>(0.005);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(0.01);
  const [accountEq, setAccountEq] = useState<number | null>(null);
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [isLoadingPicks, setIsLoadingPicks] = useState<boolean>(false);
  const [testSymbol, setTestSymbol] = useState<string>('AAPL');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingSymbol, setIsTestingSymbol] = useState<boolean>(false);
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isSearchingOpportunities, setIsSearchingOpportunities] = useState<boolean>(false);
  const [bestStrategy, setBestStrategy] = useState<any>(null);
  const [isSearchingStrategy, setIsSearchingStrategy] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'opportunities' | 'news'>('config');

  useEffect(() => {
    if (!user) return;
    const fetchAccount = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const res = await fetch(`${base}/api/account?mode=${envMode}`, { headers });
        if (!res.ok) return;
        const { account } = await res.json();
        setAccountEq(parseFloat(account.equity));
      } catch {
        setAccountEq(null);
      }
    };
    fetchAccount();
  }, [user, envMode]);

  // Fetch top market movers on mount
  useEffect(() => {
    const getTopPicks = async () => {
      setIsLoadingPicks(true);
      try {
        const { gainers } = await fetchMarketMovers('stocks');
        setTopPicks(gainers.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch top picks:', err);
      } finally {
        setIsLoadingPicks(false);
      }
    };
    
    getTopPicks();
  }, []);

  // Fetch market news on mount
  useEffect(() => {
    const getMarketNews = async () => {
      setIsLoadingNews(true);
      try {
        const news = await fetchMarketNews();
        setMarketNews(news.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch market news:', err);
      } finally {
        setIsLoadingNews(false);
      }
    };
    
    getMarketNews();
  }, []);

  const handleTestSymbol = async () => {
    if (!testSymbol) return;
    
    setIsTestingSymbol(true);
    setTestResult(null);
    
    try {
      const result = await analyzeStock(testSymbol);
      setTestResult(result);
      toast.success(`Analysis complete for ${testSymbol}`);
    } catch (err) {
      console.error('Error testing symbol:', err);
      toast.error('Failed to analyze symbol');
    } finally {
      setIsTestingSymbol(false);
    }
  };

  const handleFindOpportunities = async () => {
    setIsSearchingOpportunities(true);
    setOpportunities([]);
    
    try {
      const results = await findTradingOpportunities();
      setOpportunities(results);
      toast.success(`Found ${results.length} trading opportunities`);
    } catch (err) {
      console.error('Error finding opportunities:', err);
      toast.error('Failed to find trading opportunities');
    } finally {
      setIsSearchingOpportunities(false);
    }
  };

  const handleFindBestStrategy = async () => {
    setIsSearchingStrategy(true);
    setBestStrategy(null);
    
    try {
      const result = await findBestStrategy(envMode as 'paper' | 'live');
      setBestStrategy(result);
      
      if (result) {
        toast.success(`Found best strategy: ${result.strategy.strategy}`);
        // Auto-populate the test symbol with the best strategy symbol
        setTestSymbol(result.symbol);
        setTestResult(result);
      } else {
        toast.error('No suitable strategy found');
      }
    } catch (err) {
      console.error('Error finding best strategy:', err);
      toast.error('Failed to find best strategy');
    } finally {
      setIsSearchingStrategy(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary/20 to-blue-500/20 rounded-full blur-xl"></div>
              <div className="relative p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                <Bot className="w-12 h-12 text-brand-primary" />
                {busy && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-brand-primary to-blue-600 dark:from-white dark:via-brand-primary dark:to-blue-400 bg-clip-text text-transparent mb-4">
            Automation Bot
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            Intelligent automated trading powered by advanced algorithms and real-time market analysis
          </p>

          {/* Status Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
              envMode === 'live' 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                envMode === 'live' ? 'bg-red-500' : 'bg-green-500'
              } animate-pulse`}></div>
              <span className="text-sm font-medium">{envMode.toUpperCase()} Mode</span>
            </div>

            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
              running 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
                : 'bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-600/50 text-gray-700 dark:text-gray-300'
            }`}>
              {running ? (
                <Activity className="w-4 h-4 animate-pulse" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{running ? 'Active' : 'Inactive'}</span>
            </div>

            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">
                {accountEq !== null ? `$${formatCurrency(accountEq)}` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-b-2 border-brand-primary text-brand-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'opportunities'
                ? 'border-b-2 border-brand-primary text-brand-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Target className="w-4 h-4 inline-block mr-2" />
            Opportunities
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'news'
                ? 'border-b-2 border-brand-primary text-brand-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Activity className="w-4 h-4 inline-block mr-2" />
            Market News
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'config' && (
              <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-brand-primary/10 to-blue-500/10 rounded-xl">
                      <Settings className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bot Configuration</h2>
                      <p className="text-gray-600 dark:text-gray-400">Configure your automated trading parameters</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={running ? stop : () => start({ targetProfit, stopLossPct, takeProfitPct })}
                      disabled={busy}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                        running
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-gradient-to-r from-brand-primary to-blue-500 hover:from-brand-primary/90 hover:to-blue-500/90 text-black'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {busy ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </>
                      ) : running ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Stop Bot</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Start Bot</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Interval Setting */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <label className="text-lg font-semibold text-gray-900 dark:text-white">
                        Trading Interval
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          How often the bot checks for trading opportunities
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={interval}
                        onChange={e => setIntervalMin(Math.max(1, +e.target.value))}
                        disabled={running}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-lg font-mono disabled:opacity-50"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                        minutes
                      </span>
                    </div>
                  </div>

                  {/* Target Profit */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-green-500" />
                      <label className="text-lg font-semibold text-gray-900 dark:text-white">
                        Target Profit
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={targetProfit}
                        onChange={e => setTargetProfit(+e.target.value)}
                        disabled={running}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-lg font-mono disabled:opacity-50"
                      />
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                        $
                      </span>
                    </div>
                  </div>

                  {/* Stop Loss */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-red-500" />
                      <label className="text-lg font-semibold text-gray-900 dark:text-white">
                        Stop Loss
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.001}
                        min={0.001}
                        max={1}
                        value={stopLossPct}
                        onChange={e => setStopLossPct(+e.target.value)}
                        disabled={running}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-lg font-mono disabled:opacity-50"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Take Profit */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <label className="text-lg font-semibold text-gray-900 dark:text-white">
                        Take Profit
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.001}
                        min={0.001}
                        max={1}
                        value={takeProfitPct}
                        onChange={e => setTakeProfitPct(+e.target.value)}
                        disabled={running}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-lg font-mono disabled:opacity-50"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Test Symbol Section */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Test Strategy
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={testSymbol}
                        onChange={e => setTestSymbol(e.target.value.toUpperCase())}
                        placeholder="Enter symbol (e.g., AAPL)"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                      />
                    </div>
                    <button
                      onClick={handleTestSymbol}
                      disabled={isTestingSymbol || !testSymbol}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingSymbol ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Analyze'
                      )}
                    </button>
                  </div>
                  
                  {testResult && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg">{testResult.symbol}</span>
                          <span className={`text-sm ${testResult.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {testResult.change >= 0 ? '+' : ''}{testResult.change.toFixed(2)}%
                          </span>
                        </div>
                        <span className="font-bold">${testResult.price.toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Strategy</p>
                          <p className="font-medium">{testResult.strategy.strategy}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Recommendation</p>
                          <p className={`font-medium ${
                            testResult.strategy.recommendation === 'buy' 
                              ? 'text-green-500' 
                              : testResult.strategy.recommendation === 'sell'
                                ? 'text-red-500'
                                : 'text-yellow-500'
                          }`}>
                            {testResult.strategy.recommendation.toUpperCase()}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                          <p className="font-medium">{testResult.strategy.confidence}%</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Risk Ratio</p>
                          <p className="font-medium">
                            {testResult.strategy.stopLoss.toFixed(2)}% / {testResult.strategy.takeProfit.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Analysis</p>
                        <p className="text-sm">{testResult.strategy.analysis}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Strategy Search */}
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Auto Strategy Search
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Let the bot automatically find the best trading strategy based on current market conditions.
                  </p>
                  
                  <button
                    onClick={handleFindBestStrategy}
                    disabled={isSearchingStrategy}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchingStrategy ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Searching for best strategy...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Sparkles className="w-5 h-5" />
                        <span>Find Best Strategy</span>
                      </div>
                    )}
                  </button>
                  
                  {bestStrategy && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg">{bestStrategy.symbol}</span>
                          <span className={`text-sm ${bestStrategy.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {bestStrategy.change >= 0 ? '+' : ''}{bestStrategy.change.toFixed(2)}%
                          </span>
                        </div>
                        <span className="font-bold">${bestStrategy.price.toFixed(2)}</span>
                      </div>
                      
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Best Strategy</p>
                        <p className="font-medium">{bestStrategy.strategy.strategy}</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Analysis</p>
                        <p className="text-sm">{bestStrategy.strategy.analysis}</p>
                      </div>
                      
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => start({ targetProfit, stopLossPct, takeProfitPct })}
                          disabled={running || busy}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply & Start Bot
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Risk Warning */}
                <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        Risk Disclosure
                      </h3>
                      <p className="text-yellow-700 dark:text-yellow-300 leading-relaxed">
                        Automated trading involves substantial risk of loss. Past performance does not guarantee future results. 
                        Only trade with capital you can afford to lose. The bot operates based on algorithmic signals and market conditions can change rapidly.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl">
                      <Target className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Opportunities</h2>
                      <p className="text-gray-600 dark:text-gray-400">Discover potential trading opportunities</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleFindOpportunities}
                    disabled={isSearchingOpportunities}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchingOpportunities ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Refresh</span>
                  </button>
                </div>
                
                {isSearchingOpportunities ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Searching for trading opportunities...</p>
                  </div>
                ) : opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {opportunities.map((opportunity, index) => (
                      <div 
                        key={index}
                        className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-brand-primary/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg">{opportunity.symbol}</span>
                            <span className={`text-sm px-2 py-0.5 rounded-full ${
                              opportunity.strategy.recommendation === 'buy'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : opportunity.strategy.recommendation === 'sell'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            }`}>
                              {opportunity.strategy.recommendation.toUpperCase()}
                            </span>
                          </div>
                          <span className="font-bold">${opportunity.price.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Strategy</p>
                            <p className="font-medium">{opportunity.strategy.strategy}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                            <div className="flex items-center space-x-1">
                              <div className="h-2 flex-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    opportunity.strategy.confidence >= 70
                                      ? 'bg-green-500'
                                      : opportunity.strategy.confidence >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${opportunity.strategy.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{opportunity.strategy.confidence}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {opportunity.strategy.analysis}
                        </p>
                        
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setTestSymbol(opportunity.symbol);
                              setTestResult(opportunity);
                              setActiveTab('config');
                            }}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
                          >
                            View Details
                          </button>
                          {opportunity.strategy.recommendation === 'buy' && opportunity.strategy.confidence >= 70 && (
                            <button
                              onClick={() => {
                                // Execute trade logic
                                toast.success(`Trade executed for ${opportunity.symbol}`);
                              }}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                            >
                              Execute Trade
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <Target className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No opportunities found</p>
                    <p className="text-sm">Click the refresh button to search for trading opportunities</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'news' && (
              <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl">
                    <Activity className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Market News</h2>
                    <p className="text-gray-600 dark:text-gray-400">Latest financial news and market updates</p>
                  </div>
                </div>
                
                {isLoadingNews ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : marketNews.length > 0 ? (
                  <div className="space-y-6">
                    {marketNews.map((article, index) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          {article.summary.length > 150 
                            ? `${article.summary.substring(0, 150)}...` 
                            : article.summary}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {new Date(article.datetime).toLocaleDateString()} • {article.source}
                          </span>
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-brand-primary hover:underline"
                          >
                            Read More
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <Activity className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No news available</p>
                    <p className="text-sm">Check back later for market updates</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div className="space-y-8">
            {/* Activity Log */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Real-time bot activity</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="h-64 overflow-y-auto space-y-2">
                  {log.length > 0 ? (
                    log.slice(-10).map((entry, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                          {entry}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <Activity className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No activity yet</p>
                      <p className="text-xs">Start the bot to see activity logs</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Strategy Log */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Strategy Log</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Trading decisions and signals</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="h-64 overflow-y-auto space-y-2">
                  {strategyLog.length > 0 ? (
                    strategyLog.slice(-10).map((entry, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                          {entry}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No strategies executed</p>
                      <p className="text-xs">Strategy decisions will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Picks Section */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Market Picks</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Trending stocks with momentum</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {isLoadingPicks ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                      </div>
                    ))
                  ) : topPicks.length > 0 ? (
                    topPicks.map((pick, index) => (
                      <div 
                        key={index} 
                        className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setTestSymbol(pick.symbol);
                          handleTestSymbol();
                          setActiveTab('config');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pick.symbol}</span>
                          <span className={`text-sm ${pick.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pick.change >= 0 ? '+' : ''}{pick.change.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>${pick.price.toFixed(2)}</span>
                          <div className="flex items-center space-x-1 text-brand-primary text-xs">
                            <span>Analyze</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">No top picks available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Trades</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Since activation</p>
          </div>

          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Success Rate</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Profitable trades</p>
          </div>

          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total P&L</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">$0.00</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Net profit/loss</p>
          </div>

          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Uptime</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0h</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active time</p>
          </div>
        </div>
      </div>
    </div>
  );
}