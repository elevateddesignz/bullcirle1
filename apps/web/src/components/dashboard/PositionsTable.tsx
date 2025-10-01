// src/components/dashboard/PositionsTable.tsx
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PositionsTableProps {
  positions: any[];
}

const PositionsTable: React.FC<PositionsTableProps> = ({ positions }) => {
  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No open positions</p>
        <p className="text-sm">Start trading to see your positions here</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="space-y-3">
        {positions.map((pos) => {
          const unrealizedPL = parseFloat(pos.unrealized_pl || 0);
          const marketValue = parseFloat(pos.market_value || 0);
          const qty = parseFloat(pos.qty || 0);
          const avgEntry = parseFloat(pos.avg_entry_price || 0);
          const currentPrice = parseFloat(pos.current_price || 0);
          const isProfit = unrealizedPL >= 0;
          const plPercentage = avgEntry > 0 ? ((currentPrice - avgEntry) / avgEntry * 100) : 0;

          return (
            <div
              key={pos.symbol}
              className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-brand-primary/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isProfit 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {isProfit ? (
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{pos.symbol}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.abs(qty)} shares
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Market Value</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Avg Entry</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${avgEntry.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Current Price</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${currentPrice.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Unrealized P/L</p>
                  <p className={`font-bold ${
                    isProfit 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isProfit ? '+' : ''}${unrealizedPL.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Return</p>
                  <p className={`font-bold ${
                    isProfit 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isProfit ? '+' : ''}{plPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PositionsTable;