import React, { useState } from 'react';
import { Mail, ArrowRight, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/api';
import toast from 'react-hot-toast';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if email already exists
      const { data: existingEmails } = await supabase
        .from('waitlist')
        .select('email')
        .eq('email', email)
        .limit(1);

      if (existingEmails && existingEmails.length > 0) {
        toast.error('This email is already on our waitlist.');
        return;
      }

      // If email doesn't exist, insert it
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email }]);

      if (error) {
        throw error;
      }

      toast.success('Thanks for signing up! We\'ll keep you updated.');
      setEmail('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to submit email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 blur-3xl transform rotate-12" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-brand-primary/10 to-brand-accent/10 blur-3xl transform -rotate-12" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 relative">
                <img
                  src="https://bullcircle.com/bulllogo.png"
                  alt="BullCircle"
                  className="w-full h-full object-contain transform hover:scale-105 transition-transform duration-200 filter drop-shadow-lg"
                />
              </div>
              <div className="flex flex-col ml-2">
                <span className="text-xl font-bold">
                  Bull<span className="text-brand-primary">Circle</span>
                </span>
                <span className="text-xs text-gray-400 -mt-1">Circle of Traders</span>
              </div>
            </div>

            {/* Auth Button */}
            <div>
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-black hover:bg-brand-primary/90 transition-colors"
              >
                <LogIn size={20} />
                <span>Login</span>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 relative animate-float">
              <img
                src="https://bullcircle.com/bulllogo.png"
                alt="BullCircle"
                className="w-full h-full object-contain transform hover:scale-105 transition-transform duration-200 filter drop-shadow-lg"
              />
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-3xl font-bold">
                Bull<span className="text-brand-primary">Circle</span>
              </span>
              <span className="text-sm text-gray-400">Circle of Traders</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
                Something Big is Coming
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-300 mb-12">
            We're building a revolutionary trading platform where community and success go hand in hand. 
            Join our waitlist to be the first to know when we launch.
          </p>

          {/* Email Signup */}
          <div className="max-w-md mx-auto mb-16">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-gray-800/30 backdrop-blur-xl text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:bg-gray-800/50 transition-colors border border-brand-primary/20"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-brand-primary text-black rounded-lg font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : (
                  <>
                    Notify Me
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Community-Driven',
                description: 'Learn and grow with fellow traders in a supportive environment'
              },
              {
                title: 'Advanced Tools',
                description: 'Access professional-grade trading and analysis tools'
              },
              {
                title: 'Real-Time Data',
                description: 'Make informed decisions with live market insights'
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-800/30 backdrop-blur-xl rounded-xl p-6 border border-brand-primary/20"
              >
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-gray-900/80 backdrop-blur-lg border-t border-brand-primary/20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          <p>© 2025 BullCircle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}