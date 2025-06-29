import React from 'react';
import { X, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { useNavigate } from 'react-router-dom'; // ✅ import

interface SearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchResults({ isOpen, onClose }: SearchResultsProps) {
  const { searchQuery, searchResults, handleSymbolSelect } = useSearch();
  const navigate = useNavigate(); // ✅ hook

  if (!isOpen) return null;

  const handleSelect = (symbol: string) => {
    handleSymbolSelect(symbol); // optional: still sets in context
    onClose();
    navigate(`/trade?symbol=${symbol}`); // ✅ redirect with query param
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed left-1/2 -translate-x-1/2 top-28 z-[110] w-full max-w-2xl px-4">
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-8rem)] overflow-hidden">
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h3 className="text-lg font-semibold">
              Search Results
              {searchQuery && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  for "{searchQuery}"
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto">
            <div className="p-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((item, idx) => (
                    <div
                      key={`${item.symbol}-${idx}`}
                      onClick={() => handleSelect(item.symbol)}
                      className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded text-xs font-medium uppercase">
                          {item.market ? item.market : 'stock'}
                        </div>
                        <div>
                          <div className="font-medium">{item.symbol}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {item.price ? `$${parseFloat(item.price).toFixed(2)}` : '—'}
                          </div>
                          <div
                            className={`flex items-center gap-1 text-sm ${
                              typeof item.change === 'number'
                                ? item.change >= 0
                                  ? 'text-green-500'
                                  : 'text-red-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {typeof item.change === 'number' ? (
                              <>
                                {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {item.change >= 0 ? '+' : ''}{item.change}%
                              </>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
              Click any item to view detailed trading information
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
