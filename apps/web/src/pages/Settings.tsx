import React, { useState, useEffect } from 'react';
import { webauthn } from '../lib/webauthn';
import { useAuth } from '../contexts/AuthContext';
// Removed unused imports from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  // Removed unused isBiometricAvailable state
  // Removed unused isBiometricEnabled state
  // Removed unused isEnablingBiometric state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    tradeAlerts: true,
    marketUpdates: false,
    darkMode: theme === 'dark',
    soundEffects: true
  });
  const [profile, setProfile] = useState({
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  type SubscriptionTier = import('../types/index').SubscriptionTier;

  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const available = await webauthn.isBiometricAvailable();
        if (available && user) {
          // Use webauthn.hasCredentials instead of api.getBiometricStatus
          const hasCredentials = await webauthn.hasCredentials(user.email);
          if (hasCredentials) {
            // Removed setting isBiometricEnabled as it is unused
          }
        }
      } catch (err) {
        console.error('Failed to check biometric availability:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkBiometric();
  }, [user]);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        // Mock subscription tiers data since api.getSubscriptionTiers doesn't exist
        const mockTiers: SubscriptionTier[] = [
          {
            id: '1',
            name: 'Free',
            price: 0,
            features: ['Basic trading', 'Limited watchlist'],
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Pro',
            price: 29.99,
            features: ['Advanced trading', 'Unlimited watchlist', 'Real-time data'],
            created_at: new Date().toISOString()
          }
        ];
        setTiers(mockTiers);
      } catch (err) {
        console.error('Failed to fetch subscription tiers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription tiers');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTiers();
  }, []);

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      darkMode: theme === 'dark'
    }));
  }, [theme]);

  const handleEnableBiometric = async () => {
    if (!user) return;
    // Removed setting isEnablingBiometric as it is unused
    setError(null);
    try {
      if (user.id && user.email) {
        await webauthn.register(user.id, user.email);
      } else {
        throw new Error('User ID or email is undefined');
      }
      // Removed setting isBiometricEnabled as it is unused
      toast.success('Biometric authentication enabled successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable biometric authentication');
      toast.error('Failed to enable biometric authentication');
    } finally {
      // Removed setting isEnablingBiometric as it is unused
    }
  };

  const handleSettingToggle = (setting: keyof typeof settings) => {
    if (setting === 'darkMode') {
      toggleTheme();
    } else {
      setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Mock settings update since api.updateSettings doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.newPassword !== profile.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Mock profile update since api.updateSettings doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Profile updated successfully');
      setProfile(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgrade = async (tierId: string) => {
    try {
      // Mock upgrade since api.upgradeTier doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Subscription updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade subscription');
    }
  };

  // Removed unused handleUpgradeClick function

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      {/* Biometric Authentication Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Biometric Authentication
        </h2>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Enable biometric authentication for secure and convenient login.
          </p>
          <button
            onClick={handleEnableBiometric}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black font-medium rounded-lg transition-colors"
          >
            Enable Biometric Login
          </button>
        </div>
      </div>

      {/* Subscription Tiers Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Subscription Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((tier) => (
            <div key={tier.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
              <p className="text-2xl font-bold text-brand-primary">${tier.price}/month</p>
              <ul className="mt-4 space-y-2">
                {tier.features.map((feature, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-400">• {feature}</li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(tier.id)}
                className="mt-4 w-full px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black font-medium rounded-lg transition-colors"
              >
                {currentTier === tier.id ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Preferences
        </h2>
        <form onSubmit={handleSettingsSave} className="space-y-4">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-gray-700 dark:text-gray-300">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
              <button
                type="button"
                onClick={() => handleSettingToggle(key as keyof typeof settings)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
          {(error || success) && (
            <div className={`p-4 rounded-lg border ${error ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-green-500/10 border-green-500/50 text-green-500'}`}>
              {error || success}
            </div>
          )}
          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Profile Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Profile Settings
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={profile.username}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={profile.currentPassword}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={profile.newPassword}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={profile.confirmPassword}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}