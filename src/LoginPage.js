import React, { useState } from 'react';
import { Droplet, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth, LANDING_ROUTE } from './context/AuthContext';

export const LoginPage = ({ onNavigate }) => {
  const { signIn } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    if (!credentials.username.trim() || !credentials.password) {
      setError('Enter both your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // The role is resolved server-side from the database, so the landing
      // page can be chosen only after a successful authentication. The role
      // comes from this response rather than from local state, which has not
      // re-rendered yet.
      const loggedIn = await signIn(credentials.username.trim(), credentials.password);
      onNavigate?.(LANDING_ROUTE[loggedIn?.role] || 'donor-dashboard');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-rose-700 text-white">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-14 max-w-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
              <Droplet className="w-7 h-7 text-white fill-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">BloodCells<span className="text-red-200">.lk</span></span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Welcome back to the lifeline.</h1>
          <p className="text-lg text-red-100">
            Sign in to coordinate donations, manage requests, and save lives across Sri Lanka.
          </p>
          <div className="mt-10 space-y-3 text-sm text-red-50/90">
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Donor, Hospital &amp; Blood Bank access</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Secure, role-based dashboards</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Real-time emergency coordination</div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center">
              <Droplet className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">BloodCells<span className="text-brand-600">.lk</span></span>
          </div>

          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-800">Login to your portal</h2>
            <p className="text-gray-500 text-sm mt-1">
              Enter your credentials to continue — your role is resolved from your account
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4 mt-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={credentials.username}
                    onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50"
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all font-semibold shadow-soft flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? 'Signing in…' : 'Login'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-sm text-brand-600 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Don't have an account?{' '}
              <button onClick={() => onNavigate('register')} className="text-brand-600 hover:underline font-semibold">Register</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
