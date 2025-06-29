// src/pages/Trade.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  Star,
  DollarSign,
  BarChart2,
  RefreshCw,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

import { api } from '../lib/api';
import TradingChart from '../components/TradingChart';
import SearchResults from '../components/SearchResults';
import { useSearch } from '../contexts/SearchContext';
import { useEnvMode } from '../contexts/EnvModeContext';
import { useWatchlist } from '../contexts/WatchlistContext';

export default function Trade() {
  const [searchParams] = useSearchParams();
  const { setSearchQuery } = useSearch();
  const { envMode } = useEnvMode();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  // animation
  const [showSuccess, setShowSuccess] = useState(false);

  // stock state
  const [currentSymbol, setCurrentSymbol] = useState(
    searchParams.get('symbol') || 'AAPL'
  );
  const [symbolData, setSymbolData] = useState<{
    name: string;
    price: number;
    change: { amount: number; percentage: number };
  } | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState({ amount: 0, percentage: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // order form
  const [showOrderForm, setShowOrderForm] = useState(false);
  type OrderForm = {
    symbol: string;
    type: 'buy' | 'sell';
    shares: string;
    orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
    timeInForce: 'day' | 'gtc' | 'opg';
    limitPrice: string;
    stopPrice: string;
  };
  const [formData, setFormData] = useState<OrderForm>({
    symbol: currentSymbol,
    type: 'buy',
    shares: '',
    orderType: 'market',
    timeInForce: 'day',
    limitPrice: '',
    stopPrice: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // buying power
  const [balance, setBalance] = useState(0);
  
  // trade history
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  // fetchers
  const fetchStockData = async (symbol: string) => {
    try {
      setIsRefreshing(true);
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/alpha-quotes?symbols=${symbol}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const q = data.quotes[symbol];
      const price = parseFloat(q['05. price']);
      const amt = parseFloat(q['09. change']);
      const pct = parseFloat((q['10. change percent'] || '0%').replace('%',''));
      setSymbolData({ name: symbol, price, change: { amount: amt, percentage: pct } });
      setCurrentPrice(price);
      setPriceChange({ amount: amt, percentage: pct });
    } catch (err) {
      setError('Failed to load stock data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchAccountData = async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/account?mode=${envMode}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { account } = await resp.json();
      setBalance(parseFloat(account.buying_power));
    } catch {
      setBalance(0);
    }
  };

  const fetchTradeHistory = async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/account?mode=${envMode}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { orders } = await resp.json();
      setTradeHistory(orders?.slice(0, 5) || []);
    } catch (err) {
      console.error('Failed to fetch trade history:', err);
    }
  };

  // on mount + polling
  useEffect(() => {
    const sym = searchParams.get('symbol') || 'AAPL';
    setCurrentSymbol(sym);
    setFormData(f => ({ ...f, symbol: sym }));
    fetchStockData(sym);
    fetchAccountData();
    fetchTradeHistory();
    const iv = setInterval(() => {
      fetchStockData(sym);
      fetchAccountData();
      fetchTradeHistory();
    }, 30_000);
    return () => clearInterval(iv);
  }, [searchParams, envMode]);

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const validationPrice =
      formData.orderType === 'market'
        ? currentPrice
        : parseFloat(formData.limitPrice || formData.stopPrice || '0');
    const cost = parseFloat(formData.shares) * validationPrice;
    if (cost > balance) {
      setError('Insufficient funds');
      setIsSubmitting(false);
      return;
    }

    try {
      const { orderType, stopPrice, limitPrice, shares, symbol, timeInForce, type } = formData;
      const payload: any = {
        symbol,
        side: type,
        type: orderType,
        time_in_force: timeInForce,
        qty: parseFloat(shares),
      };
      if (orderType === 'limit') {
        payload.limit_price = parseFloat(limitPrice);
      } else if (orderType === 'stop') {
        payload.stop_price = parseFloat(stopPrice);
      } else if (orderType === 'stop_limit') {
        payload.stop_price  = parseFloat(stopPrice);
        payload.limit_price = parseFloat(limitPrice);
      }

      await api.executeTrade(payload, envMode as 'paper' | 'live');

      // play success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // reset form + balance
      setFormData(f => ({ ...f, shares: '', limitPrice: '', stopPrice: '' }));
      setBalance(b => b - cost);
      setShowOrderForm(false);
      
      // Refresh trade history
      fetchTradeHistory();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWatchlistToggle = () => {
    if (isInWatchlist(currentSymbol)) {
      removeFromWatchlist(currentSymbol);
    } else {
      addToWatchlist(currentSymbol, symbolData?.name);
    }
  };

  const handleRefresh = () => {
    fetchStockData(currentSymbol);
    fetchAccountData();
    fetchTradeHistory();
  };

  // Calculate estimated cost
  const estimatedCost = parseFloat(formData.shares || '0') * 
    (formData.orderType === 'market' 
      ? currentPrice 
      : parseFloat(formData.limitPrice || formData.stopPrice || '0'));

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 🎉 Confetti & pop‑in checkmark */}
      <AnimatePresence>
        {showSuccess && (
          <Confetti recycle={false} numberOfPieces={150} gravity={0.2} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-green-500/20 p-8 rounded-full">
              <CheckCircle size={96} className="text-green-500 drop-shadow-lg" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-brand-primary/10 to-blue-500/10 rounded-xl">
              <BarChart2 className="w-8 h-8 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trade</h1>
              <p className="text-gray-600 dark:text-gray-400">Execute trades in {envMode.toUpperCase()} mode</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              envMode === 'live' 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              {envMode.toUpperCase()} Mode
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Symbol Header */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentSymbol}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{symbolData?.name || 'Loading...'}</p>
                  </div>
                  <button
                    onClick={handleWatchlistToggle}
                    className={`p-2 rounded-lg transition-colors ${
                      isInWatchlist(currentSymbol)
                        ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30'
                        : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={isInWatchlist(currentSymbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    <Star size={20} className={isInWatchlist(currentSymbol) ? 'fill-current' : ''} />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${currentPrice.toFixed(2)}</p>
                  <p className={`flex items-center justify-end space-x-1 ${priceChange.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange.amount >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>
                      {priceChange.amount >= 0 ? '+' : ''}
                      {priceChange.amount.toFixed(2)} ({priceChange.percentage.toFixed(2)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg overflow-hidden">
              <TradingChart symbol={currentSymbol} />
            </div>

            {/* Recent Trades */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Trades</h3>
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              
              {tradeHistory.length > 0 ? (
                <div className="space-y-3">
                  {tradeHistory.map((order, index) => {
                    const isBuy = order.side?.toLowerCase() === 'buy';
                    const filledPrice = parseFloat(order.filled_avg_price || 0);
                    const qty = parseFloat(order.qty || 0);
                    
                    return (
                      <div 
                        key={order.id || index}
                        className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              isBuy 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            }`}>
                              {isBuy ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{order.symbol}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(order.submitted_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {isBuy ? 'Buy' : 'Sell'} {qty} shares
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {filledPrice > 0 ? `$${filledPrice.toFixed(2)}` : 'Market'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'filled' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : order.status === 'canceled' || order.status === 'cancelled'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            Total: ${(filledPrice * qty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent trades</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Form Section */}
          <div className="space-y-6">
            {/* Mobile Order Form Toggle */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowOrderForm(v => !v)}
                className="w-full flex items-center justify-center space-x-2 p-4 bg-brand-primary hover:bg-brand-primary/90 text-black font-semibold rounded-xl transition-colors shadow-lg"
              >
                {showOrderForm ? (
                  <>
                    <X className="w-5 h-5" />
                    <span>Hide Order Form</span>
                  </>
                ) : (
                  <>
                    <Menu className="w-5 h-5" />
                    <span>Show Order Form</span>
                  </>
                )}
              </button>
            </div>

            {/* Account Summary */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700/50">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Available to Trade</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mode</p>
                    <p className={`text-lg font-bold ${
                      envMode === 'live' 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {envMode.toUpperCase()}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    envMode === 'live' 
                      ? 'bg-red-100 dark:bg-red-900/30' 
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {envMode === 'live' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div className={`bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg ${
              showOrderForm ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Place Order</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Symbol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Symbol
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={e => {
                        const v = e.target.value.toUpperCase();
                        setFormData(f => ({ ...f, symbol: v }));
                        setSearchQuery(v);
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Buy / Sell */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Action
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, type: 'buy' }))}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.type === 'buy'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-medium">Buy</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, type: 'sell' }))}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.type === 'sell'
                          ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingDown className="w-5 h-5" />
                        <span className="font-medium">Sell</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Order Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['market', 'limit'] as const).map(o => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, orderType: o }))}
                        className={`
                          py-2 px-3 rounded-lg text-sm font-medium transition-colors
                          ${formData.orderType === o
                            ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}
                        `}
                      >
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </button>
                    ))}
                    {(['stop', 'stop_limit'] as const).map(o => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, orderType: o }))}
                        className={`
                          py-2 px-3 rounded-lg text-sm font-medium transition-colors
                          ${formData.orderType === o
                            ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}
                        `}
                      >
                        {o === 'stop_limit' ? 'Stop Limit' : o.charAt(0).toUpperCase() + o.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={formData.shares}
                      onChange={e => setFormData(f => ({ ...f, shares: e.target.value }))}
                      placeholder="Enter number of shares"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
                      {[0.25, 0.5, 1, 5].map(qty => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, shares: qty.toString() }))}
                          className="px-2 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Conditional Price Inputs */}
                {formData.orderType === 'limit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Limit Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.limitPrice}
                        onChange={e => setFormData(f => ({ ...f, limitPrice: e.target.value }))}
                        placeholder="Enter limit price"
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.orderType === 'stop' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stop Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.stopPrice}
                        onChange={e => setFormData(f => ({ ...f, stopPrice: e.target.value }))}
                        placeholder="Enter stop price"
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.orderType === 'stop_limit' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Stop Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.stopPrice}
                          onChange={e => setFormData(f => ({ ...f, stopPrice: e.target.value }))}
                          placeholder="Enter stop price"
                          className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Limit Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.limitPrice}
                          onChange={e => setFormData(f => ({ ...f, limitPrice: e.target.value }))}
                          placeholder="Enter limit price"
                          className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Time in Force */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time in Force
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'day', label: 'Day' },
                      { value: 'gtc', label: 'GTC' },
                      { value: 'opg', label: 'OPG' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, timeInForce: value as any }))}
                        className={`
                          py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1
                          ${formData.timeInForce === value
                            ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}
                        `}
                      >
                        <Clock className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Order Summary</h4>
                    <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Symbol</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formData.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Action</span>
                      <span className={`font-medium ${
                        formData.type === 'buy' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formData.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Quantity</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formData.shares || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Price</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.orderType === 'market' 
                          ? `$${currentPrice.toFixed(2)} (Market)` 
                          : formData.orderType === 'limit'
                          ? `$${formData.limitPrice || '0'} (Limit)`
                          : formData.orderType === 'stop'
                          ? `$${formData.stopPrice || '0'} (Stop)`
                          : `$${formData.stopPrice || '0'} / $${formData.limitPrice || '0'} (Stop-Limit)`
                        }
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">Estimated Cost</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        ${estimatedCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.shares}
                  className={`
                    w-full py-4 rounded-xl text-black font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all
                    ${formData.type === 'buy' 
                      ? 'bg-gradient-to-r from-blue-500 to-brand-primary hover:from-blue-600 hover:to-brand-primary/90' 
                      : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                    }
                    ${isSubmitting || !formData.shares ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {formData.type === 'buy' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      <span>
                        {formData.type === 'buy' ? 'Buy' : 'Sell'} {formData.shares || '0'} {currentSymbol}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Market Insights */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg">
                  <Info className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Insights</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Price</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">${currentPrice.toFixed(2)}</p>
                    <div className={`flex items-center space-x-1 ${priceChange.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {priceChange.amount >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {priceChange.amount >= 0 ? '+' : ''}
                        {priceChange.percentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trading Tips</p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start space-x-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-primary" />
                      <span>Set stop losses to protect your capital</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-primary" />
                      <span>Consider using limit orders for better price control</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-primary" />
                      <span>Don't risk more than 2% of your account on a single trade</span>
                    </li>
                  </ul>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quick Links</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button className="p-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      Research
                    </button>
                    <button className="p-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      News
                    </button>
                    <button className="p-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      Financials
                    </button>
                    <button className="p-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      Options
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Order Form Toggle */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setShowOrderForm(v => !v)}
          className="p-4 bg-brand-primary rounded-full text-black shadow-lg hover:shadow-xl transition-all"
        >
          {showOrderForm ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* search modal */}
      <SearchResults isOpen={false} onClose={() => {}} />
    </div>
  );
}