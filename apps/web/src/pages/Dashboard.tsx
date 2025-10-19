// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Activity, 
  Briefcase, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  BarChart3, 
  PieChart, 
  Zap, 
  Shield, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEnvMode } from '../contexts/EnvModeContext';
import FundsWallet from '../components/FundsWallet';

import AccountSummary   from '../components/dashboard/AccountSummary';
import PerformanceChart, { DataPoint } from '../components/dashboard/PerformanceChart';
import PositionsTable   from '../components/dashboard/PositionsTable';
import OrdersTable      from '../components/dashboard/OrdersTable';
import NewsFeed         from '../components/dashboard/NewsFeed';
import Watchlist        from '../components/dashboard/Watchlist';

import { marketFetch, tradeFetch } from '../lib/api';

const MARKET_SYMBOLS = ['SPY', 'QQQ', 'DIA'];

interface SummaryCardProps {
  label: string;
  value: any;
  icon: JSX.Element;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function SummaryCard({ label, value, icon, trend, isLoading = false }: SummaryCardProps) {
  return (
    <div className="group relative bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-brand-primary/30">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 rounded-xl group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {trend.isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Loading...</span>
            </div>
          ) : (
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors duration-300">
              {value == null
                ? '—'
                : typeof value === 'number'
                ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : value}
            </h3>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ 
  title, 
  description, 
  icon, 
  onClick, 
  variant = 'default' 
}: {
  title: string;
  description: string;
  icon: JSX.Element;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success';
}) {
  const variants = {
    default: 'bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700/50',
    primary: 'bg-gradient-to-br from-brand-primary/10 to-blue-500/10 hover:from-brand-primary/20 hover:to-blue-500/20 border-brand-primary/30',
    success: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border-green-500/30'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:scale-105 text-left ${variants[variant]}`}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { envMode } = useEnvMode();

  const [account, setAccount] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [marketClock, setMarketClock] = useState<any | null>(null);
  const [marketSnapshot, setMarketSnapshot] = useState<Array<{ symbol: string; price: number | null; ts: string | null }>>([]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const env = (envMode === 'live' ? 'live' : 'paper') as 'paper' | 'live';

      const [accountRes, positionsRes, ordersRes, historyRes] = await Promise.all([
        tradeFetch('/v2/alpaca/account', { envMode: env }),
        tradeFetch('/v2/alpaca/positions', { envMode: env }),
        tradeFetch('/v2/alpaca/orders?status=all&limit=10', { envMode: env }),
        tradeFetch('/account/history', { envMode: env }),
      ]);

      if (!accountRes.ok) throw new Error(`Account fetch failed: ${accountRes.status}`);
      if (!positionsRes.ok) throw new Error(`Positions fetch failed: ${positionsRes.status}`);
      if (!ordersRes.ok) throw new Error(`Orders fetch failed: ${ordersRes.status}`);
      if (!historyRes.ok) throw new Error(`History fetch failed: ${historyRes.status}`);

      const accountJson = await accountRes.json();
      const positionsJson = await positionsRes.json();
      const ordersJson = await ordersRes.json();
      const historyJson = await historyRes.json();

      setAccount(accountJson?.account ?? null);
      setPositions(Array.isArray(positionsJson?.positions) ? positionsJson.positions : []);
      setOrders(Array.isArray(ordersJson?.orders) ? ordersJson.orders : []);

      const historyPoints: DataPoint[] = Array.isArray(historyJson?.history)
        ? historyJson.history
            .map((item: any) => ({
              date: item?.date ?? '',
              value: typeof item?.equity === 'number' ? item.equity : Number.parseFloat(item?.equity ?? '0'),
            }))
            .filter(point => point.date && Number.isFinite(point.value))
        : [];
      setHistory(historyPoints);

      try {
        const clockRes = await marketFetch('/clock');
        if (clockRes.ok) {
          setMarketClock(await clockRes.json());
        }
      } catch (clockError) {
        console.warn('[Dashboard] Failed to fetch market clock', clockError);
      }

      try {
        const snapshot = await Promise.all(
          MARKET_SYMBOLS.map(async (sym) => {
            try {
              const [quoteRes, tradeRes] = await Promise.all([
                marketFetch(`/market/quote?symbol=${encodeURIComponent(sym)}`),
                marketFetch(`/market/trade/latest?symbol=${encodeURIComponent(sym)}`),
              ]);
              const quoteJson = quoteRes.ok ? await quoteRes.json() : null;
              const tradeJson = tradeRes.ok ? await tradeRes.json() : null;
              const trade = tradeJson?.trade;
              const price = typeof trade?.price === 'number' ? trade.price : null;
              const ts = typeof trade?.ts === 'string' ? trade.ts : quoteJson?.ts ?? null;
              return { symbol: sym, price, ts };
            } catch (snapshotError) {
              console.warn(`[Dashboard] Market snapshot failed for ${sym}`, snapshotError);
              return { symbol: sym, price: null, ts: null };
            }
          })
        );
        setMarketSnapshot(snapshot);
      } catch (snapshotError) {
        console.warn('[Dashboard] Failed to load market snapshot', snapshotError);
        setMarketSnapshot([]);
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      console.error('[Dashboard Load Error]', e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, envMode]);

  // Calculate trends for summary cards
  const portfolioTrend = history.length > 1 ? {
    value: ((history[history.length - 1]?.value - history[history.length - 2]?.value) / history[history.length - 2]?.value * 100) || 0,
    isPositive: (history[history.length - 1]?.value || 0) >= (history[history.length - 2]?.value || 0)
  } : undefined;

  const totalPnL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl || 0), 0);
  const pnlTrend = totalPnL !== 0 ? {
    value: Math.abs(totalPnL),
    isPositive: totalPnL >= 0
  } : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-brand-primary/20 to-blue-500/20 rounded-xl">
                  <BarChart3 className="w-8 h-8 text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Welcome back, {user?.email?.split('@')[0] || 'Trader'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mode Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${
                envMode === 'live' 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  envMode === 'live' ? 'bg-red-500' : 'bg-green-500'
                } animate-pulse`} />
                <span className="text-sm font-medium">Trading Mode (orders only): {envMode.toUpperCase()}</span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Refresh</span>
              </button>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            {marketClock && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>
                  Market {marketClock.is_open ? 'Open' : 'Closed'}
                  {marketClock.next_open && (
                    <span className="ml-2">
                      Next open: {new Date(marketClock.next_open).toLocaleTimeString()}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 dark:text-red-300 font-medium">Error loading data</p>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        )}

        {marketSnapshot.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Market Snapshot</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketSnapshot.map(({ symbol, price, ts }) => (
                <div
                  key={symbol}
                  className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-brand-primary" />
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{symbol}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ts ? new Date(ts).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeof price === 'number' ? `$${price.toFixed(2)}` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest trade price</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            label="Portfolio Value"
            value={account?.portfolio_value}
            icon={<DollarSign className="w-6 h-6 text-green-500" />}
            trend={portfolioTrend}
            isLoading={isLoading}
          />
          <SummaryCard
            label="Buying Power"
            value={account?.buying_power}
            icon={<Briefcase className="w-6 h-6 text-blue-500" />}
            isLoading={isLoading}
          />
          <SummaryCard
            label="Cash Balance"
            value={account?.cash}
            icon={<DollarSign className="w-6 h-6 text-purple-500" />}
            isLoading={isLoading}
          />
          <SummaryCard
            label="Unrealized P/L"
            value={totalPnL}
            icon={<TrendingUp className="w-6 h-6 text-yellow-500" />}
            trend={pnlTrend}
            isLoading={isLoading}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              title="Start Trading"
              description="Execute trades and manage positions"
              icon={<TrendingUp className="w-5 h-5 text-brand-primary" />}
              onClick={() => window.location.href = '/trade'}
              variant="primary"
            />
            <QuickActionCard
              title="Trading Bot"
              description="AI-powered trading analysis"
              icon={<Zap className="w-5 h-5 text-purple-500" />}
              onClick={() => window.location.href = '/trading-bot'}
              variant="default"
            />
            <QuickActionCard
              title="Market Research"
              description="Latest news and market insights"
              icon={<BarChart3 className="w-5 h-5 text-green-500" />}
              onClick={() => window.location.href = '/research'}
              variant="success"
            />
          </div>
        </div>

        {/* Watchlist - Horizontal Layout */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-6">
            <Watchlist horizontal={true} maxItems={6} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Performance Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-brand-primary/10 to-blue-500/10 rounded-lg">
                    <PieChart className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio Performance</h2>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Activity className="w-4 h-4" />
                  <span>30 Days</span>
                </div>
              </div>
              
              {history.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No performance data available</p>
                  <p className="text-sm">Start trading to see your portfolio performance</p>
                </div>
              ) : (
                <PerformanceChart data={history} />
              )}
            </div>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            <AccountSummary data={account} />
          </div>
        </div>

        {/* Positions and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Positions */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Open Positions</h2>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {positions.length} position{positions.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {positions.length > 0 ? (
              <PositionsTable positions={positions} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <Target className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No open positions</p>
                <p className="text-sm">Start trading to see your positions here</p>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Orders</h2>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last 10 orders
              </div>
            </div>
            
            {orders.length > 0 ? (
              <OrdersTable orders={orders} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No recent orders</p>
                <p className="text-sm">Your trading history will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* News Feed */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-lg">
                  <Activity className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Market News</h2>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Sparkles className="w-4 h-4" />
                <span>Live Updates</span>
              </div>
            </div>
            <NewsFeed />
          </div>
        </div>

        {/* Funds Wallet */}
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg">
          <FundsWallet />
        </div>
      </div>
    </div>
  );
}
