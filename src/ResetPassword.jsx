import React, { useMemo, useState } from 'react';
import { Droplet, Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import * as api from './services/api';

/** Password rules kept in the UI as well as the server, for instant feedback. */
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
];

/**
 * Reads the reset token from the URL. The backend builds links as
 * `<frontend>/#/reset-password?token=...`, so both the hash and a plain query
 * string are supported.
 */
export const readResetToken = () => {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const search = window.location.search || '';
  const params = new URLSearchParams(`${search}&${hashQuery}`);
  return params.get('token') || '';
};

export const ResetPassword = ({ onNavigate }) => {
  const token = useMemo(readResetToken, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const failedRules = PASSWORD_RULES.filter((r) => !r.test(password));
  const isValid = failedRules.length === 0 && password === confirm;
  const mismatch = touched && confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!isValid) return;

    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderCard = () => (
    <div className="min-h-screen bg-slate-50 flex">
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
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Set a new password.</h1>
          <p className="text-lg text-red-100">
            Choose something you have not used before. You will be signed out everywhere the old password was used.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center">
              <Droplet className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">BloodCells<span className="text-brand-600">.lk</span></span>
          </div>

          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            {done ? (
              <>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 text-center">Password updated</h2>
                <p className="text-gray-500 text-sm mt-2 text-center leading-relaxed">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => onNavigate('login')}
                  className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all font-semibold"
                >
                  Go to Login <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </>
            ) : !token ? (
              <>
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertCircle className="w-7 h-7 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 text-center">Reset link invalid</h2>
                <p className="text-gray-500 text-sm mt-2 text-center leading-relaxed">
                  This page needs a reset link. Request a new one and open it within 60 minutes.
                </p>
                <button
                  onClick={() => onNavigate('forgot-password')}
                  className="w-full mt-6 inline-flex items-center justify-center gap-2 border border-brand-200 text-brand-600 py-3 rounded-xl hover:bg-brand-50 transition-colors font-semibold"
                >
                  Request a new link
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800">Create a new password</h2>
                <p className="text-gray-500 text-sm mt-1">Your reset link is valid for 60 minutes.</p>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(true)}
                        autoComplete="new-password"
                        className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Enter a new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {PASSWORD_RULES.map((r) => (
                          <li
                            key={r.label}
                            className={`text-xs flex items-center gap-1.5 ${r.test(password) ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {r.test(password) ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300" />}
                            {r.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onBlur={() => setTouched(true)}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                          mismatch ? 'border-brand-500' : 'border-gray-200'
                        }`}
                        placeholder="Re-enter your new password"
                      />
                    </div>
                    {mismatch && <p className="text-xs text-brand-600 mt-1">Passwords do not match.</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all font-semibold shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                  <button onClick={() => onNavigate('login')} className="text-brand-600 hover:underline font-semibold">
                    Back to Login
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return renderCard();
};
