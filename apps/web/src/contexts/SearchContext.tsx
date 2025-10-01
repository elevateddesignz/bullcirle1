// src/contexts/SearchContext.tsx
import React, { createContext, useContext, useState } from 'react';

export interface SearchResult {
  symbol: string;
  name: string;
  market?: string;
  price?: string;
  change?: number;
}

interface SearchContextProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;
  handleSymbolSelect: (symbol: string) => void;
}

const SearchContext = createContext<SearchContextProps | null>(null);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSymbolSelect = (symbol: string) => {
    console.log('Selected symbol:', symbol);
    // Here you might navigate to Trade page or update other state accordingly.
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        handleSymbolSelect,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
