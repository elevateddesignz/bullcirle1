// src/components/Layout.tsx
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  LineChart,
  Globe,
  ScanLine,
  Sun,
  Moon,
  Menu,
  X,
  Zap,
  Settings,
  Search as SearchIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useEnvMode } from '../contexts/EnvModeContext';
import StockTicker from './StockTicker';
import SearchBar from './SearchBar';

const SIDEBAR_ITEMS = [
  { path: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'   },
  { path: '/markets',      icon: Globe,           label: 'Markets'     },
  { path: '/trade',        icon: TrendingUp,      label: 'Trade'       },
  { path: '/screener',     icon: ScanLine,        label: 'Screener'    },
  { path: '/research',     icon: LineChart,       label: 'Research'    },
  { path: '/learn',        icon: BookOpen,        label: 'University'  },
  { path: '/trading-bot',  icon: Zap,             label: 'Trading Bot' },
  { path: '/automation',   icon: ScanLine,        label: 'Automation'  },
  { path: '/settings',     icon: Settings,        label: 'Settings'    },
];

const BOTTOM_NAV = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Home'    },
  { path: '/markets',     icon: Globe,           label: 'Markets' },
  { path: '/trade',       icon: TrendingUp,      label: 'Trade'   },
  { path: '/trading-bot', icon: Zap,             label: 'Trading Bot' },
  { path: '/automation',   icon: ScanLine,        label: 'Automation'  },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const location = useLocation();
  const { logout }    = useAuth();
  const { theme, toggleTheme }     = useTheme();
  const { envMode, toggleEnvMode } = useEnvMode();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-dark text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-3">
            {/* mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="https://bullcircle.com/bulllogo.png"
                alt="BullCircle"
                className="w-8 h-8 object-contain transition-transform hover:scale-105 filter drop-shadow-lg"
              />
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-xl font-bold">
                  Bull<span className="text-brand-primary">Circle</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  Circle of Traders
                </span>
              </div>
            </Link>
          </div>

          {/* desktop search */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <SearchBar />
          </div>

          <div className="flex items-center space-x-2">
            {/* mobile search toggle */}
            <button
              onClick={() => setMobileSearch(s => !s)}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <SearchIcon size={20} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={toggleEnvMode}
              title="Switch trading environment (paper vs live). Market data is unaffected."
              className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {envMode === 'paper' ? 'Trading: Paper' : 'Trading: Live'}
            </button>
            <button
              onClick={logout}
              className="px-4 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* mobile search bar */}
        {mobileSearch && (
          <div className="md:hidden px-4 pb-2 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-700/50">
            <SearchBar />
          </div>
        )}

        {/* stock ticker */}
        <StockTicker />
      </header>

      {/* sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 w-64 bg-white dark:bg-gray-900/95 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700/50 
          transform transition-transform duration-200 ease-in-out z-50

          /* drop down under header+ticker: 7rem total = top-28 */
          top-28 bottom-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}

          /* desktop: same offset, always visible */
          md:top-28 md:bottom-0 md:translate-x-0 md:h-[calc(100vh-7rem)]
        `}
      >
        <nav className="h-full overflow-y-auto p-4 space-y-2">
          {SIDEBAR_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-2 rounded-md transition-colors
                  ${active
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-brand-primary'
                  }
                `}
              >
                <Icon size={20} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content: start below 7rem header+ticker */}
      <main className="pt-28 pb-20 md:ml-64 transition-all">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700/50 z-50">
        <div className="flex justify-around">
          {BOTTOM_NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex flex-col items-center py-2 transition-colors
                  ${active ? 'text-brand-primary' : 'text-gray-500 dark:text-gray-400'}
                `}
              >
                <Icon size={20} />
                <span className="text-[10px]">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
