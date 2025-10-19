import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Download } from 'lucide-react';
import { resolveApiPath } from '../lib/backendConfig';

interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  ipoDate: string;
  status: string;
}

interface ScreenerFilters {
  marketCap: string;
  sector: string;
  priceRange: string;
  volume: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

function SelectFilter({ label, value, onChange, options }: SelectFilterProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 rounded-lg border border-brand-primary/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Screener() {
  const [results, setResults] = useState<StockData[]>([]);
  const [filters, setFilters] = useState<ScreenerFilters>({
    marketCap: 'all',
    sector: 'all',
    priceRange: 'all',
    volume: 'all',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // For navigation on click.
  const navigate = useNavigate();

  // Update this URL to point to your backend endpoint that proxies the Alpha Vantage CSV response.
  const backendListingsURL = resolveApiPath('/alpha-listings');

  const fetchStockListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(backendListingsURL);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();

      // If the CSV contains HTML (e.g. an error page) handle it gracefully.
      if (csvText.includes('<html') || csvText.toLowerCase().includes('error')) {
        throw new Error('Backend returned an error or exceeded API limits.');
      }

      // Split CSV into lines and parse header + rows.
      const lines = csvText.split('\n').filter((line) => line.trim() !== '');
      if (lines.length === 0) {
        throw new Error('No CSV data received.');
      }

      // The first line is assumed to be headers.
      const headers = lines[0].split(',').map((header) => header.trim());

      const listings: StockData[] = lines
        .slice(1)
        .map((line) => {
          const values = line.split(',').map((v) => v.trim());
          // Only include rows that have the expected number of columns.
          if (values.length < headers.length) return null;
          return {
            symbol: values[headers.indexOf('symbol')],
            name: values[headers.indexOf('name')],
            exchange: values[headers.indexOf('exchange')],
            assetType: values[headers.indexOf('assetType')],
            ipoDate: values[headers.indexOf('ipoDate')],
            status: values[headers.indexOf('status')],
          } as StockData;
        })
        .filter(Boolean) as StockData[];

      // Filter out items with no symbol.
      setResults(listings.filter((item) => item.symbol));
    } catch (err: any) {
      console.error('Error fetching listing data:', err);
      setError('Failed to load listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockListings();
  }, []);

  // Optional filtering logic based on filters state.
  const filteredResults = results.filter((stock) => {
    // Example: Filter by assetType if the sector filter is not "all"
    if (filters.sector !== 'all' && stock.assetType.toLowerCase() !== filters.sector.toLowerCase()) {
      return false;
    }
    return true;
  });

  // When a row is clicked, navigate to the trade page with the chosen symbol.
  const handleRowClick = (symbol: string) => {
    // Navigate to /trade with the symbol as a query parameter.
    navigate(`/trade?symbol=${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stock Screener</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors">
          <Download size={20} />
          Export Results
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-brand-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-brand-primary" />
          <h2 className="text-xl font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SelectFilter
            label="Market Cap"
            value={filters.marketCap}
            onChange={(value) => setFilters((prev) => ({ ...prev, marketCap: value }))}
            options={[
              { value: 'all', label: 'All' },
              { value: 'mega', label: 'Mega ($200B+)' },
              { value: 'large', label: 'Large ($10B-$200B)' },
              { value: 'mid', label: 'Mid ($2B-$10B)' },
              { value: 'small', label: 'Small ($300M-$2B)' },
            ]}
          />
          <SelectFilter
            label="Sector"
            value={filters.sector}
            onChange={(value) => setFilters((prev) => ({ ...prev, sector: value }))}
            options={[
              { value: 'all', label: 'All' },
              { value: 'technology', label: 'Technology' },
              { value: 'healthcare', label: 'Healthcare' },
              { value: 'finance', label: 'Finance' },
              { value: 'consumer', label: 'Consumer' },
            ]}
          />
          <SelectFilter
            label="Price Range"
            value={filters.priceRange}
            onChange={(value) => setFilters((prev) => ({ ...prev, priceRange: value }))}
            options={[
              { value: 'all', label: 'All' },
              { value: 'under10', label: 'Under $10' },
              { value: '10to50', label: '$10 - $50' },
              { value: '50to100', label: '$50 - $100' },
              { value: 'over100', label: 'Over $100' },
            ]}
          />
          <SelectFilter
            label="Volume"
            value={filters.volume}
            onChange={(value) => setFilters((prev) => ({ ...prev, volume: value }))}
            options={[
              { value: 'all', label: 'All' },
              { value: 'over1m', label: 'Over 1M' },
              { value: 'over500k', label: 'Over 500K' },
              { value: 'over100k', label: 'Over 100K' },
            ]}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-gray-800/30 rounded-xl border border-brand-primary/20 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-brand-primary/20 text-sm font-medium text-gray-400">
          <div>Symbol</div>
          <div className="col-span-2">Name</div>
          <div>Exchange</div>
          <div>IPO Date</div>
          <div>Status</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading listings...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredResults.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No results found.</div>
        ) : (
          <div className="divide-y divide-brand-primary/10">
            {filteredResults.map((stock) => (
              <div
                key={stock.symbol}
                className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-brand-primary/5 transition-colors cursor-pointer"
                onClick={() => handleRowClick(stock.symbol)}
              >
                <div className="font-medium text-brand-primary">{stock.symbol}</div>
                <div className="col-span-2">{stock.name}</div>
                <div>{stock.exchange}</div>
                <div>{stock.ipoDate}</div>
                <div>{stock.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
