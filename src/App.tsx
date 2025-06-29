import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SearchProvider } from './contexts/SearchContext';
import { EnvModeProvider } from './contexts/EnvModeContext';
import { WatchlistProvider } from './contexts/WatchlistContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Trade from './pages/Trade';
import TradingBot from './pages/tradingbot';
import SocialFeed from './pages/SocialFeed';
import Settings from './pages/Settings';
import Learn from './pages/Learn';
import BullScript from './pages/Learn/BullScript';
import TradingBasics from './pages/Learn/TradingBasics';
import Research from './pages/Research';
import Markets from './pages/Markets';
import Screener from './pages/Screener';
import TechnicalAnalysis from './pages/Learn/TechnicalAnalysis';
import SearchBar from './components/SearchBar';
import AutomationBot from './pages/AutomationBot';

// Stripe imports for Checkout route
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from './stripePromise';
import CheckoutForm from './components/CheckoutForm';

function AppContent() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const location = useLocation();
  const excludedPaths = ['/', '/login', '/register'];
  const showSearchBar = !excludedPaths.includes(location.pathname);

  return (
    <>
      {showSearchBar && (
        <div className="px-4 py-2 border-b border-gray-700">
          <SearchBar />
          {searchResults.length > 0 && (
            <ul className="bg-white dark:bg-gray-800 mt-2 rounded shadow p-4">
              {searchResults.map((result, idx) => (
                <li key={idx}>
                  {result.name} ({result.symbol})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/trading-bot" element={<TradingBot />} />
          <Route path="/social" element={<SocialFeed />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/bullscript" element={<BullScript />} />
          <Route path="/learn/trading-basics" element={<TradingBasics />} />
          <Route path="/learn/technical-analysis" element={<TechnicalAnalysis />} />
          <Route path="/research" element={<Research />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/automation" element={<AutomationBot />} />
        </Route>

        {/* Stripe Checkout route */}
        <Route
          path="/checkout"
          element={
            <Elements stripe={stripePromise}>
              <CheckoutForm />
            </Elements>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Helmet>
        <title>Bull Circle</title>
        <meta
          name="description"
          content="Circle of Traders - Your trusted community for trading success"
        />
      </Helmet>
      <ThemeProvider>
        <EnvModeProvider>
          <AuthProvider>
            <WatchlistProvider>
              <SearchProvider>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    className:
                      'dark:bg-gray-800 dark:text-white light:bg-white light:text-gray-800',
                    style: { border: '1px solid rgba(0, 255, 255, 0.2)' },
                    success: {
                      iconTheme: { primary: '#00FFFF', secondary: 'var(--toast-bg)' },
                    },
                    error: {
                      iconTheme: { primary: '#EF4444', secondary: 'var(--toast-bg)' },
                    },
                  }}
                />
                <AppContent />
              </SearchProvider>
            </WatchlistProvider>
          </AuthProvider>
        </EnvModeProvider>
      </ThemeProvider>
    </Router>
  );
}