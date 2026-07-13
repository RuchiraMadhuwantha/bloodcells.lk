import React, { useState } from 'react';
import { Droplet, User, Lock, ArrowRight } from 'lucide-react';
import { buildLoginPayload, getBloodBankDemoLogin } from './services/authMapping';

export const LoginPage = ({ onLogin, onNavigate }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const bloodBankDemo = getBloodBankDemoLogin(credentials);
      if (bloodBankDemo) {
        onLogin(bloodBankDemo.role, bloodBankDemo.token, bloodBankDemo.user);
        return;
      }

      const payload = buildLoginPayload(credentials);
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      onLogin(data.user.role, data.token, data.user);
    } catch (error) {
      alert(error.message || 'Login failed.');
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
            <p className="text-gray-500 text-sm mt-1">Enter your credentials to continue</p>

            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={credentials.username}
                    onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50"
                    placeholder="Enter your username"
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
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all font-semibold shadow-soft flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? 'Signing in…' : 'Login'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

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
