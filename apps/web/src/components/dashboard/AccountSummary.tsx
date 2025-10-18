// src/components/dashboard/AccountSummary.tsx
import React from 'react';
import { DollarSign, TrendingUp, Shield, Activity, CheckCircle, AlertTriangle, Briefcase } from 'lucide-react';

interface AccountSummaryData {
  portfolio_value?: number | string | null;
  buying_power?: number | string | null;
  cash?: number | string | null;
  daytrading_buying_power?: number | string | null;
  status?: string | null;
  pattern_day_trader?: boolean | null;
}

interface AccountSummaryProps {
  data: AccountSummaryData | null;
}

const AccountSummary: React.FC<AccountSummaryProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const toNumber = (value: number | string | null | undefined): number => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const portfolioValue = toNumber(data.portfolio_value);
  const buyingPower = toNumber(data.buying_power);
  const cash = toNumber(data.cash);
  const dayTradingPower = toNumber(data.daytrading_buying_power);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'restricted':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'closed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'restricted':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'closed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
          <Shield className="w-6 h-6 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Summary</h2>
      </div>

      <div className="space-y-4">
        {/* Portfolio Value */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Portfolio Value</p>
                <p className="text-xl font-bold text-green-800 dark:text-green-200 break-words">
                  ${formatCurrency(portfolioValue)}
                </p>
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        {/* Buying Power */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Briefcase className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Buying Power</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white break-words">
                ${formatCurrency(buyingPower)}
              </p>
            </div>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <DollarSign className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cash Balance</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white break-words">
                ${formatCurrency(cash)}
              </p>
            </div>
          </div>
        </div>

        {/* Day Trading Power */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Activity className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Day Trading Power</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white break-words">
                ${formatCurrency(dayTradingPower)}
              </p>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              {getStatusIcon(data.status)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Status</p>
                <p className={`text-lg font-bold capitalize ${getStatusColor(data.status)}`}>
                  {data.status}
                </p>
              </div>
            </div>
          </div>
          {data.pattern_day_trader && (
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">PDT</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pattern Day Trader</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;