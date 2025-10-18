// src/pages/TradingBot.tsx
import { useEnvMode } from '../contexts/EnvModeContext';
import { useTheme } from '../contexts/ThemeContext';
import TrendBox from '../components/TrendBox';
import LiveChart from '../components/LiveChart';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Sparkles,
  BarChart3,
  DollarSign,
  Percent,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { marketFetch, tradeFetch } from '../lib/api';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function getNextAvailableTimestamp(): number {
  return parseInt(localStorage.getItem('fullscanNextRun') || '0', 10);
}

function setNextAvailableTimestamp() {
  const next = Date.now() + TWELVE_HOURS_MS;
  localStorage.setItem('fullscanNextRun', String(next));
  return next;
}

const cls = (...bits: (string | false | null | undefined)[]) =>
  bits.filter(Boolean).join(' ');

export default function TradingBot() {
  const analysisRef = useRef<HTMLDivElement>(null);
  const { envMode } = useEnvMode();
  const { theme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [symbol, setSymbol] = useState('AAPL');
  const [analysis, setAnalysis] = useState('');
  const [recommend, setRec] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [strategy, setStrategy] = useState('');
  const [confidence, setConfidence] = useState(0);

  const [market, setMarket] = useState<'stocks' | 'crypto'>('stocks');
  const [gainers, setGainers] = useState<any[]>([]);
  const [losers, setLosers] = useState<any[]>([]);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [riskPercent, setRiskPercent] = useState(10);
  const [tradeType, setTradeType] = useState<'fractional' | 'whole'>('fractional');
  const [qty, setQty] = useState(1);
  const [autoMode, setAutoMode] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    const stored = localStorage.getItem('promptHistory');
    return stored ? JSON.parse(stored) : [];
  });     
  const [cachedSymbols, setCachedSymbols] = useState<string[]>([]);
  const [symbolFilter, setSymbolFilter] = useState('');
  const filteredSymbols = useMemo(
    () => cachedSymbols.filter((sym) => sym.startsWith(symbolFilter.toUpperCase())),
    [cachedSymbols, symbolFilter]
  );
  const [currentPage, setCurrentPage] = useState(1);
  const symbolsPerPage = 50;

  const paginatedSymbols = useMemo(() => {
    const start = (currentPage - 1) * symbolsPerPage;
    return filteredSymbols.slice(start, start + symbolsPerPage);
  }, [filteredSymbols, currentPage]);

  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  useEffect(() => {
    if (!autoMode) return;

    const tick = async () => {
      try {
        const res = await tradeFetch('/tradingbot/auto', {
          method: 'POST',
          envMode: envMode as 'paper' | 'live',
          body: JSON.stringify({ market }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data?.executed?.length) {
          setToast(`Auto-traded: ${data.executed.map((t: any) => t.symbol).join(', ')}`);
        }
      } catch (err: any) {
        setError(err?.message || 'Auto trade failed');
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 60000);
    return () => clearInterval(interval);
  }, [autoMode, market, envMode]);

  const [nextScanTime, setNextScanTime] = useState(getNextAvailableTimestamp());
  const [remainingTime, setRemainingTime] = useState('');
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (nextScanTime > now) {
        const remaining = nextScanTime - now;
        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setRemainingTime(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setRemainingTime('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextScanTime]);

  const runSingle = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await tradeFetch('/tradingbot', {
        method: 'POST',
        envMode: envMode as 'paper' | 'live',
        body: JSON.stringify({ symbol, prompt: userPrompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { strategy, recommendation, confidence, analysis, history } = await res.json();
      setAnalysis(analysis);
      setRec(recommendation);
      setStrategy(strategy);
      setConfidence(confidence);
      setHistory(history || []);
      if (analysisRef.current) {
        setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      
      if (userPrompt.trim()) {
        const updated = [userPrompt, ...promptHistory.filter(p => p !== userPrompt)].slice(0, 5);
        setPromptHistory(updated);
        localStorage.setItem('promptHistory', JSON.stringify(updated));
      }
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };
      
  const executeTrade = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await tradeFetch('/tradingbot/execute', {
        method: 'POST',
        envMode: envMode as 'paper' | 'live',
        body: JSON.stringify({
          symbol,
          priceEstimate: 170,
          ...(tradeType === 'whole' ? { qty } : { riskPercent }),
        }),
      });
      if (!res.ok) throw new Error(`Trade failed: HTTP ${res.status}`);
      await res.json();
      setToast(`Trade executed for ${symbol} with ${riskPercent}% risk`);
    } catch (e: any) {
      setError(e.message || 'Failed to execute trade');
    } finally {
      setBusy(false);
    }
  };

  const fetchPlays = async () => {
    setBusy(true);
    setError('');
    setGainers([]);
    setLosers([]);
    try {
      const res = await tradeFetch(`/tradingbot/plays?market=${encodeURIComponent(market)}&limit=10`, {
        envMode: envMode as 'paper' | 'live',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { gainers, losers } = await res.json();
      setGainers(gainers);
      setLosers(losers);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  const zebra = useMemo(
    () => (idx: number) =>
      idx % 2 === 0 ? (theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50') : '',
    [theme]
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500/20 border-green-500/30';
    if (confidence >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <LiveChart symbol={symbol} />
      
      {/* Header Section */}
      <div className="relative z-10 pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Bot className="w-16 h-16 text-brand-primary animate-pulse" />
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-brand-primary via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
              Bull Circle Bot
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              AI-powered trading analysis with advanced market intelligence
            </p>
            <div className="flex items-center justify-center mt-4 space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Trading Mode (orders only): {envMode.toUpperCase()}
                </span>
              </div>
              {autoMode && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Auto Trading Active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Main Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Analysis Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-brand-primary/10 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Quick Analysis
                  </h2>
                </div>
                {busy && (
                  <div className="flex items-center space-x-2 text-brand-primary">
                    <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Analyzing...</span>
                  </div>
                )}
              </div>

              {/* Symbol Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ticker Symbol
                </label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-lg font-mono uppercase"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL, TSLA, BTC"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              {/* Auto Mode Toggle */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Auto Trading Mode</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically execute trades based on AI signals
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Strategy Prompt */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Strategy Prompt (Optional)
                  </label>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Try: "What's the best momentum play today?"
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. What's the best momentum play today?"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                    />
                    <button
                      onClick={runSingle}
                      disabled={busy || !userPrompt.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {promptHistory.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recent:</span>
                      {promptHistory.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setUserPrompt(p)}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-brand-primary/10 text-gray-600 dark:text-gray-300 rounded-md transition-colors"
                        >
                          {p.length > 30 ? `${p.substring(0, 30)}...` : p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={runSingle}
                  disabled={busy}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-brand-primary to-blue-500 hover:from-brand-primary/90 hover:to-blue-500/90 disabled:opacity-50 text-black font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  {busy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run Analysis</span>
                    </>
                  )}
                </button>

                <button
                  onClick={async () => {
                    setLoadingSymbols(true);
                    try {
                      const res = await tradeFetch('/tradingbot/fullscan/init', {
                        envMode: envMode as 'paper' | 'live',
                      });
                      const data = await res.json();
                      const next = setNextAvailableTimestamp();
                      setNextScanTime(next);
                      setToast(`Loaded ${data.total || 0} symbols`);
                    } catch (err) {
                      setError('Failed to load stock symbols');
                    } finally {
                      setLoadingSymbols(false);
                    }
                  }}
                  disabled={Date.now() < nextScanTime || loadingSymbols}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  {loadingSymbols ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </>
                  ) : Date.now() < nextScanTime ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Available in {remainingTime}</span>
                    </>
                  ) : (
                    <>
                      <Filter className="w-4 h-4" />
                      <span>Full Scan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Analysis Results */}
              {analysis && (
                <div ref={analysisRef} className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Analysis Results</h3>
                    <div className={`px-3 py-1 rounded-full border ${getConfidenceBg(confidence)}`}>
                      <span className={`text-sm font-bold ${getConfidenceColor(confidence)}`}>
                        {confidence}% Confidence
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Strategy</span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">{strategy}</p>
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Signal</span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">{recommend}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Analysis</span>
                    </div>
                    <p className="text-gray-900 dark:text-white leading-relaxed">{analysis}</p>
                  </div>

                  {history.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Recent 5-Day History</h4>
                      <TrendBox history={history} />
                    </div>
                  )}

                  {confidence >= 70 && (
                    <button
                      onClick={() => setConfirming(true)}
                      disabled={busy}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Execute Trade</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Trade Settings */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trade Settings</h3>
              </div>

              <div className="space-y-6">
                {/* Trade Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Trade Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTradeType('fractional')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tradeType === 'fractional'
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                          : 'border-gray-200 dark:border-gray-600 hover:border-brand-primary/50'
                      }`}
                    >
                      <Percent className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-sm font-medium">Fractional</span>
                    </button>
                    <button
                      onClick={() => setTradeType('whole')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tradeType === 'whole'
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                          : 'border-gray-200 dark:border-gray-600 hover:border-brand-primary/50'
                      }`}
                    >
                      <DollarSign className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-sm font-medium">Whole Shares</span>
                    </button>
                  </div>
                </div>

                {/* Risk/Quantity Settings */}
                {tradeType === 'fractional' ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Risk Percentage
                      </label>
                      <span className="text-lg font-bold text-brand-primary">{riskPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1%</span>
                      <span>Conservative</span>
                      <span>Aggressive</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Shares
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                    />
                  </div>
                )}

                {/* Risk Warning */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Risk Warning</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Trading involves substantial risk. Only trade with money you can afford to lose.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Selector */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Market Selection</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMarket('stocks')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    market === 'stocks'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-brand-primary/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-sm font-medium">Stocks</span>
                </button>
                <button
                  onClick={() => setMarket('crypto')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    market === 'crypto'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-brand-primary/50'
                  }`}
                >
                  <Zap className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-sm font-medium">Crypto</span>
                </button>
              </div>
              <button
                onClick={fetchPlays}
                disabled={busy}
                className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all"
              >
                <Activity className="w-4 h-4" />
                <span>Refresh Plays</span>
              </button>
            </div>
          </div>
        </div>

        {/* Momentum Plays Section */}
        {(gainers.length > 0 || losers.length > 0) && (
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Momentum Plays</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Activity className="w-4 h-4" />
                <span>Live Market Data</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MomentumTable title="Top Gainers" rows={gainers} type="gainers" zebra={zebra} />
              <MomentumTable title="Top Losers" rows={losers} type="losers" zebra={zebra} />
            </div>
          </div>
        )}

        {/* Cached Symbols Section */}
        {filteredSymbols.length > 0 && (
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Symbol Explorer</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredSymbols.length.toLocaleString()} symbols
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pl-10 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  placeholder="Filter symbols (e.g. AAPL)"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {paginatedSymbols.map((sym, i) => (
                      <CachedSymbolRow
                        key={sym}
                        symbol={sym}
                        index={(currentPage - 1) * symbolsPerPage + i}
                        zebra={zebra(i)}
                        onClick={() => {
                          setSymbol(sym);
                          runSingle();
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {Math.ceil(filteredSymbols.length / symbolsPerPage)}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      p < Math.ceil(filteredSymbols.length / symbolsPerPage) ? p + 1 : p
                    )
                  }
                  disabled={currentPage >= Math.ceil(filteredSymbols.length / symbolsPerPage)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Trade</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Execute trade for <strong>{symbol}</strong> using{' '}
                <strong>{tradeType === 'whole' ? `${qty} shares` : `${riskPercent}% risk`}</strong>?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setConfirming(false);
                    await executeTrade();
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 text-white font-medium rounded-lg transition-all"
                >
                  Confirm Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-xl shadow-lg z-50">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-xl shadow-lg z-50">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Success</p>
              <p className="text-sm text-green-700 dark:text-green-300">{toast}</p>
            </div>
            <button
              onClick={() => setToast('')}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MomentumTable({
  title,
  rows,
  type,
  zebra,
}: {
  title: string;
  rows: any[];
  type: 'gainers' | 'losers';
  zebra: (i: number) => string;
}) {
  if (!rows.length) return null;
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
      <div className="flex items-center space-x-2 mb-4">
        {type === 'gainers' ? (
          <TrendingUp className="w-5 h-5 text-green-500" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 5).map((r, i) => (
          <div key={r.symbol} className={`flex items-center justify-between p-3 rounded-lg ${zebra(i)} hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors`}>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{r.symbol}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">${r.price.toFixed(2)}</div>
            </div>
            <div className={`text-right ${r.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <div className="font-semibold">{r.change.toFixed(2)}%</div>
              <div className="text-xs opacity-75">
                {r.change >= 0 ? '+' : ''}{((r.price * r.change) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CachedSymbolRow({
  symbol,
  index,
  onClick,
  zebra,
}: {
  symbol: string;
  index: number;
  onClick: () => void;
  zebra: string;
}) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const [quoteRes, tradeRes, barsRes] = await Promise.all([
          marketFetch(`/market/quote?symbol=${encodeURIComponent(symbol)}`),
          marketFetch(`/market/trade/latest?symbol=${encodeURIComponent(symbol)}`),
          marketFetch(`/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=5Min&limit=2`),
        ]);
        if (!quoteRes.ok) {
          throw new Error(`HTTP ${quoteRes.status}`);
        }
        const tradeJson = tradeRes.ok ? await tradeRes.json() : null;
        const barsPayload = barsRes.ok ? await barsRes.json() : null;
        const bars = Array.isArray(barsPayload?.bars) ? barsPayload.bars : [];
        const lastBar = bars[bars.length - 1];
        const prevBar = bars[bars.length - 2];
        const priceValue = typeof tradeJson?.trade?.price === 'number'
          ? tradeJson.trade.price
          : typeof lastBar?.c === 'number'
          ? lastBar.c
          : null;
        if (priceValue !== null) setPrice(priceValue);
        if (lastBar && prevBar) {
          const pct = ((Number(lastBar.c) - Number(prevBar.c)) / Number(prevBar.c)) * 100;
          if (Number.isFinite(pct)) setChange(pct);
        }
      } catch {
        setPrice(null);
        setChange(null);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [symbol]);

  return (
    <tr 
      className={`${zebra} cursor-pointer hover:bg-brand-primary/5 transition-colors group`} 
      onClick={onClick}
    >
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
      <td className="px-4 py-3">
        <span className="font-medium text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
          {symbol}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {loading ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-primary rounded-full animate-spin ml-auto"></div>
        ) : price !== null ? (
          <span className="font-medium text-gray-900 dark:text-white">${price.toFixed(2)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {loading ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-primary rounded-full animate-spin ml-auto"></div>
        ) : change !== null ? (
          <span className={`font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}