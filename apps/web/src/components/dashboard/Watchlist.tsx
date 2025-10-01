import React, { useState } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Star, RefreshCw, Eye } from 'lucide-react';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { useNavigate } from 'react-router-dom';

interface WatchlistProps {
  horizontal?: boolean;
  showHeader?: boolean;
  maxItems?: number;
}

const Watchlist: React.FC<WatchlistProps> = ({ 
  horizontal = false, 
  showHeader = true, 
  maxItems 
}) => {
  const { watchlist, addToWatchlist, removeFromWatchlist, updateWatchlistPrices, isLoading } = useWatchlist();
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  const displayedWatchlist = maxItems ? watchlist.slice(0, maxItems) : watchlist;

  const handleAddSymbol = () => {
    if (newSymbol.trim()) {
      addToWatchlist(newSymbol.trim().toUpperCase());
      setNewSymbol('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSymbol();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSymbol('');
    }
  };

  const handleSymbolClick = (symbol: string) => {
    navigate(`/trade?symbol=${symbol}`);
  };

  if (horizontal) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg">
                <Eye className="w-6 h-6 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Watchlist</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={updateWatchlistPrices}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {displayedWatchlist.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No symbols in watchlist</p>
            <p className="text-sm">Add stocks to track their performance</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {displayedWatchlist.map((item) => {
              const isPositive = (item.change || 0) >= 0;
              
              return (
                <div
                  key={item.symbol}
                  onClick={() => handleSymbolClick(item.symbol)}
                  className="flex-shrink-0 p-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 hover:border-brand-primary/50 transition-all cursor-pointer group min-w-[140px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
                      {item.symbol}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(item.symbol);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.price ? `$${item.price.toFixed(2)}` : '—'}
                    </div>
                    <div className={`flex items-center space-x-1 text-sm ${
                      isPositive 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {item.change !== undefined 
                          ? `${isPositive ? '+' : ''}${item.change.toFixed(2)}%` 
                          : '—'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Symbol Input */}
        {isAdding && (
          <div className="flex items-center space-x-2 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border-2 border-dashed border-brand-primary/50">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors"
              autoFocus
            />
            <button
              onClick={handleAddSymbol}
              className="px-3 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSymbol('');
              }}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {maxItems && watchlist.length > maxItems && (
          <div className="text-center">
            <button 
              onClick={() => navigate('/markets')}
              className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium"
            >
              View All ({watchlist.length})
            </button>
          </div>
        )}
      </div>
    );
  }

  // Vertical layout (original)
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Watchlist</h3>
          <button
            onClick={updateWatchlistPrices}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {displayedWatchlist.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No symbols in watchlist</p>
          <p className="text-sm">Add stocks to track their performance</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedWatchlist.map((item) => {
            const isPositive = (item.change || 0) >= 0;
            
            return (
              <div
                key={item.symbol}
                onClick={() => handleSymbolClick(item.symbol)}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-lg ${
                    isPositive 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
                      {item.symbol}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.price ? `$${item.price.toFixed(2)}` : '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    isPositive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {item.change !== undefined 
                      ? `${isPositive ? '+' : ''}${item.change.toFixed(2)}%` 
                      : '—'
                    }
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(item.symbol);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Symbol */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
        {isAdding ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors"
              autoFocus
            />
            <button
              onClick={handleAddSymbol}
              className="px-3 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSymbol('');
              }}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-600/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg transition-colors group"
          >
            <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-brand-primary transition-colors" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-brand-primary transition-colors">
              Add Symbol
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Watchlist;