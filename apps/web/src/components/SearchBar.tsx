import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import SearchResults from './SearchResults';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  placeholder = 'Search stocks, crypto, or forex...',
  className = '',
}: SearchBarProps) {
  // Get all needed functions/values from the context.
  const { searchQuery, setSearchQuery, setSearchResults } = useSearch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      setLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/alpha-search?query=${encodeURIComponent(
            searchQuery
          )}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        // Update the searchResults in the context.
        setSearchResults(data.results || []);
      } catch (error) {
        console.error("Error fetching search results:", error);
      } finally {
        setLoading(false);
        setIsModalOpen(true);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full bg-gray-100 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:bg-gray-50 dark:focus:bg-gray-800/70 transition-colors border border-gray-200 dark:border-gray-700"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary rounded-lg transition-colors flex items-center gap-2"
          disabled={searchQuery.trim().length < 2 || loading}
        >
          <Search size={18} />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      <SearchResults isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
