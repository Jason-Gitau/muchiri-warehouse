'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Warehouse, Mail, ArrowRight, CheckCircle2, AlertCircle, Package, TrendingUp, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage('Check your email for the magic link!');
      setEmail('');
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-16">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
              <Warehouse className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold">Muchiri</h2>
              <p className="text-blue-300 text-sm">Warehouse Management</p>
            </div>
          </div>

          {/* Main Headline */}
          <div className="mb-12">
            <h1 className="text-white text-5xl font-bold leading-tight mb-6">
              Streamline Your<br />
              Supply Chain<br />
              <span className="text-blue-400">Operations</span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Complete inventory management, order processing, and distribution tracking—all in one powerful platform.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Real-Time Inventory</h3>
                <p className="text-slate-400 text-sm">Track stock levels across warehouses and distributors instantly</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Smart Analytics</h3>
                <p className="text-slate-400 text-sm">Make data-driven decisions with comprehensive insights</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Secure & Compliant</h3>
                <p className="text-slate-400 text-sm">Complete audit trails and role-based access control</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-slate-400 text-sm">
          <p>&copy; 2024 Muchiri Warehouse. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-10">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
              <Warehouse className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900 text-xl font-bold">Muchiri</h2>
              <p className="text-slate-600 text-xs">Warehouse Management</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome back
            </h2>
            <p className="text-slate-600">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-green-800 text-sm font-medium">{message}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center space-x-2 group"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending magic link...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Email</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-start space-x-2 text-slate-600">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                <p className="text-xs leading-relaxed">
                  We'll send you a secure magic link. No password needed—just click the link in your email to sign in.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
