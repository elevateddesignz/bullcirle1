import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WatchlistItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  addedAt: string;
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  addToWatchlist: (symbol: string, name?: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  updateWatchlistPrices: () => Promise<void>;
  isLoading: boolean;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('bullcircle_watchlist');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setWatchlist(parsed);
      } catch (error) {
        console.error('Failed to parse stored watchlist:', error);
        // Initialize with default symbols if parsing fails
        const defaultWatchlist = [
          { symbol: 'AAPL', name: 'Apple Inc.', addedAt: new Date().toISOString() },
          { symbol: 'TSLA', name: 'Tesla Inc.', addedAt: new Date().toISOString() },
          { symbol: 'MSFT', name: 'Microsoft Corp.', addedAt: new Date().toISOString() },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', addedAt: new Date().toISOString() },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', addedAt: new Date().toISOString() },
        ];
        setWatchlist(defaultWatchlist);
        localStorage.setItem('bullcircle_watchlist', JSON.stringify(defaultWatchlist));
      }
    } else {
      // Initialize with default symbols
      const defaultWatchlist = [
        { symbol: 'AAPL', name: 'Apple Inc.', addedAt: new Date().toISOString() },
        { symbol: 'TSLA', name: 'Tesla Inc.', addedAt: new Date().toISOString() },
        { symbol: 'MSFT', name: 'Microsoft Corp.', addedAt: new Date().toISOString() },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', addedAt: new Date().toISOString() },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', addedAt: new Date().toISOString() },
      ];
      setWatchlist(defaultWatchlist);
      localStorage.setItem('bullcircle_watchlist', JSON.stringify(defaultWatchlist));
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (watchlist.length > 0) {
      localStorage.setItem('bullcircle_watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist]);

  const addToWatchlist = (symbol: string, name?: string) => {
    const upperSymbol = symbol.toUpperCase();
    if (!isInWatchlist(upperSymbol)) {
      const newItem: WatchlistItem = {
        symbol: upperSymbol,
        name: name || upperSymbol,
        addedAt: new Date().toISOString(),
      };
      setWatchlist(prev => [...prev, newItem]);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    setWatchlist(prev => prev.filter(item => item.symbol !== upperSymbol));
  };

  const isInWatchlist = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    return watchlist.some(item => item.symbol === upperSymbol);
  };

  const updateWatchlistPrices = async () => {
    if (watchlist.length === 0) return;
    
    setIsLoading(true);
    try {
      const symbols = watchlist.map(item => item.symbol).join(',');
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/api/alpha-quotes?symbols=${symbols}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setWatchlist(prev => prev.map(item => {
          const quote = data.quotes[item.symbol];
          if (quote) {
            return {
              ...item,
              price: parseFloat(quote['05. price'] || 0),
              change: parseFloat(quote['10. change percent']?.replace('%', '') || 0),
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('Failed to update watchlist prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-update prices every 30 seconds
  useEffect(() => {
    updateWatchlistPrices();
    const interval = setInterval(updateWatchlistPrices, 30000);
    return () => clearInterval(interval);
  }, [watchlist.length]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        updateWatchlistPrices,
        isLoading,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};