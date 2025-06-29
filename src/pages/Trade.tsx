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
  Search,
  CheckCircle,
  Star,
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

  // fetchers
  const fetchStockData = async (symbol: string) => {
    try {
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
    } catch {
      setError('Failed to load stock data.');
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

  // on mount + polling
  useEffect(() => {
    const sym = searchParams.get('symbol') || 'AAPL';
    setCurrentSymbol(sym);
    setFormData(f => ({ ...f, symbol: sym }));
    fetchStockData(sym);
    fetchAccountData();
    const iv = setInterval(() => {
      fetchStockData(sym);
      fetchAccountData();
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

  return (
    <div className="relative h-[calc(100vh-7rem)] flex flex-col lg:flex-row">
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
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <CheckCircle size={96} className="text-green-400 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left Panel ── */}
      <div className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-3xl font-bold">{currentSymbol}</h1>
              <p className="text-gray-400">{symbolData?.name || 'Loading...'}</p>
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
            <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
            <p className={priceChange.amount >= 0 ? 'text-green-500' : 'text-red-500'}>
              {priceChange.amount >= 0 ? '+' : ''}
              {priceChange.amount.toFixed(2)} ({priceChange.percentage.toFixed(2)}%)
            </p>
          </div>
        </div>
        <TradingChart symbol={currentSymbol} />
        <div className="bg-gray-800 rounded p-4">
          <div className="flex justify-between text-sm">
            <span>Available to Trade</span>
            <span>${balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Order Form ── */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setShowOrderForm(v => !v)}
          className="p-4 bg-blue-500 rounded-full text-white shadow-lg"
        >
          {showOrderForm ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <div
        className={`
          fixed lg:relative inset-0 z-40 ${showOrderForm ? 'translate-y-0' : 'translate-y-full'}
          lg:translate-y-0 transition-transform duration-300 bg-gray-900 p-4 lg:p-6 overflow-y-auto lg:w-96
        `}
      >
        {/* mobile header */}
        <div className="lg:hidden flex justify-between items-center mb-4">
          <button onClick={() => setShowOrderForm(false)}>
            <ChevronLeft className="text-white" />
          </button>
          <h2 className="text-lg font-semibold text-white">Place Order</h2>
          <div />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol */}
          <div>
            <label className="text-sm text-gray-400">Symbol</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={formData.symbol}
                onChange={e => {
                  const v = e.target.value.toUpperCase();
                  setFormData(f => ({ ...f, symbol: v }));
                  setSearchQuery(v);
                }}
                className="w-full p-2 rounded bg-gray-800 text-white"
              />
              <Search className="absolute right-2 top-2 text-gray-500" />
            </div>
          </div>

          {/* Order Type */}
          <div>
            <label className="text-sm text-gray-400">Order Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['market','limit','stop','stop_limit'] as const).map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, orderType: o }))}
                  className={`
                    py-1 rounded text-sm
                    ${formData.orderType === o
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-200'}
                  `}
                >
                  {o === 'stop_limit' ? 'Stop Limit' : o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Buy / Sell */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData(f => ({ ...f, type: 'buy' }))}
              className={`
                p-2 rounded border text-center
                ${formData.type === 'buy'
                  ? 'bg-blue-600 text-white'
                  : 'border-blue-600 text-blue-600'}
              `}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setFormData(f => ({ ...f, type: 'sell' }))}
              className={`
                p-2 rounded border text-center
                ${formData.type === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'border-red-600 text-red-600'}
              `}
            >
              Sell
            </button>
          </div>

          {/* Quantity & conditional prices */}
          <div className="space-y-2">
            <div>
              <label className="text-sm text-gray-400">Quantity</label>
              <input
                type="number"
                step="any"
                value={formData.shares}
                onChange={e => setFormData(f => ({ ...f, shares: e.target.value }))}
                placeholder="e.g. 0.25"
                className="w-full p-2 rounded bg-gray-800 text-white"
                required
              />
            </div>
            {formData.orderType === 'limit' && (
              <input
                type="number"
                step="0.01"
                value={formData.limitPrice}
                onChange={e => setFormData(f => ({ ...f, limitPrice: e.target.value }))}
                placeholder="Limit Price"
                className="w-full p-2 rounded bg-gray-800 text-white"
                required
              />
            )}
            {formData.orderType === 'stop' && (
              <input
                type="number"
                step="0.01"
                value={formData.stopPrice}
                onChange={e => setFormData(f => ({ ...f, stopPrice: e.target.value }))}
                placeholder="Stop Price"
                className="w-full p-2 rounded bg-gray-800 text-white"
                required
              />
            )}
            {formData.orderType === 'stop_limit' && (
              <>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stopPrice}
                  onChange={e => setFormData(f => ({ ...f, stopPrice: e.target.value }))}
                  placeholder="Stop Price"
                  className="w-full p-2 rounded bg-gray-800 text-white"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  value={formData.limitPrice}
                  onChange={e => setFormData(f => ({ ...f, limitPrice: e.target.value }))}
                  placeholder="Limit Price"
                  className="w-full p-2 rounded bg-gray-800 text-white"
                  required
                />
              </>
            )}
          </div>

          {/* Time in Force */}
          <div>
            <label className="text-sm text-gray-400">Time in Force</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
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
                    py-2 rounded text-sm
                    ${formData.timeInForce === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-200'}
                  `}
                >
                  <Clock className="inline-block mr-1" size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary & errors */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Est. Cost</span>
              <span className="font-bold">
                {(
                  parseFloat(formData.shares || '0') *
                  (formData.orderType === 'market'
                    ? currentPrice
                    : parseFloat(formData.limitPrice || formData.stopPrice || '0'))
                ).toFixed(2)}
              </span>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500 flex items-center">
                <AlertTriangle className="mr-1" size={16} />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              w-full py-3 rounded text-white font-semibold
              ${formData.type === 'buy' ? 'bg-blue-500' : 'bg-red-500'}
              ${isSubmitting ? 'opacity-50' : ''}
            `}
          >
            {isSubmitting
              ? 'Processing…'
              : `${formData.type === 'buy' ? 'Buy' : 'Sell'} ${formData.shares || 0}`}
          </button>
        </form>
      </div>

      {/* search modal */}
      <SearchResults isOpen={false} onClose={() => {}} />
    </div>
  );
}