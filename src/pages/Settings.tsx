import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
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
          const { data, error } = await api.getBiometricStatus(user.id);
          if (!error && data) {
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
        const data = await api.getSubscriptionTiers();
        if (data) setTiers(data);
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
      await api.updateSettings(settings);
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
      await api.updateSettings(profile);
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
      await api.upgradeTier(tierId);
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
      {/* Subscription Tiers Section */}
      {/* Other sections for Notifications, Profile Settings etc. */}
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
  );
}
