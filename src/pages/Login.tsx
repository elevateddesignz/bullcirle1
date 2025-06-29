import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogIn, ArrowLeft, Fingerprint, Smartphone, Monitor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { webauthn } from '../lib/webauthn';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'mobile' : 'desktop');

    const checkBiometric = async () => {
      try {
        const available = await webauthn.isBiometricAvailable();
        setIsBiometricAvailable(available);
        
        if (available && formData.email) {
          const credentials = await webauthn.hasCredentials(formData.email);
          setHasCredentials(credentials);
        }
      } catch (err) {
        console.error('Failed to check biometric availability:', err);
        setIsBiometricAvailable(false);
      }
    };

    checkBiometric();
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(formData.email, formData.password);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      
      // Provide more helpful error messages
      if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before logging in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!formData.email) {
      toast.error('Please enter your email first');
      return;
    }

    setIsBiometricLoading(true);
    setError(null);

    try {
      await webauthn.authenticate(formData.email);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      toast.success('Successfully logged in with biometrics!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Biometric login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleSetupBiometric = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password first');
      return;
    }

    setIsBiometricLoading(true);
    setError(null);

    try {
      // First login with password to get user ID
      await login(formData.email, formData.password);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found after login');

      // Setup biometric
      await webauthn.register(user.id, formData.email);
      setHasCredentials(true);
      toast.success('Biometric authentication setup successfully!');
      
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to setup biometric authentication';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const getBiometricButtonText = () => {
    if (isBiometricLoading) return 'Verifying...';
    if (!hasCredentials) return `Setup ${deviceType === 'mobile' ? 'Biometric' : 'Biometric'} Login`;
    return `Login with ${deviceType === 'mobile' ? 'Biometric' : 'Biometric'}`;
  };

  const getBiometricIcon = () => {
    if (deviceType === 'mobile') {
      return <Fingerprint size={20} />;
    }
    return <Fingerprint size={20} />;
  };

  const getBiometricDescription = () => {
    if (deviceType === 'mobile') {
      return 'Use your fingerprint, face, or PIN to login quickly and securely';
    }
    return 'Use Windows Hello, Touch ID, or other biometric authentication';
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img
              src="https://bullcircle.com/bulllogo.png"
              alt="BullCircle"
              className="w-16 h-16 mx-auto mb-4"
            />
          </Link>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-gray-400 mt-2">Login to your BullCircle account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input w-full"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-400">
                Password
              </label>
              <Link 
                to="/forgot-password" 
                className="text-sm text-brand-primary hover:text-brand-accent transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="input w-full"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-primary/90 hover:to-brand-accent/90 text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Logging in...'
              ) : (
                <>
                  <LogIn size={20} />
                  Login with Password
                </>
              )}
            </button>

            {isBiometricAvailable && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-brand-dark text-gray-400">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={hasCredentials ? handleBiometricLogin : handleSetupBiometric}
                  disabled={isBiometricLoading || !formData.email || (!hasCredentials && !formData.password)}
                  className="w-full btn bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
                >
                  {getBiometricIcon()}
                  {getBiometricButtonText()}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    {getBiometricDescription()}
                  </p>
                  {!hasCredentials && formData.email && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Enter your password first to setup biometric login
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-primary hover:text-brand-accent transition-colors">
              Register now
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Need help? Try creating a new account if you don't have one yet.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}