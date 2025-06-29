import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(formData.email, formData.password, formData.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-gray-400 mt-2">Join the BullCircle trading community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="input w-full"
              placeholder="Choose a username"
              required
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
              Password
            </label>
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-primary/90 hover:to-brand-accent/90 text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              'Creating account...'
            ) : (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary hover:text-brand-accent transition-colors">
              Login instead
            </Link>
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