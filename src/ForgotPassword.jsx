import React, { useState } from 'react';
import { Droplet, Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';
import * as api from './services/api';

export const ForgotPassword = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const data = await api.forgotPassword(email.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // No SMTP provider is configured, so in development the backend returns the
  // single-use token. Show it here so the flow can still be completed locally.
  const resetLink = result?.resetToken
    ? `${window.location.origin}${window.location.pathname}#reset-password?token=${result.resetToken}`
    : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Recover your access.</h1>
          <p className="text-lg text-red-100">
            We'll help you get back to coordinating donations and saving lives across Sri Lanka.
          </p>
          <div className="mt-10 space-y-3 text-sm text-red-50/90">
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Secure, role-based dashboards</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Donor, Hospital &amp; Blood Bank access</div>
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
            {result ? (
              <>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 text-center">Check your inbox</h2>
                <p className="text-gray-500 text-sm mt-2 text-center leading-relaxed">{result.message}</p>

                {resetLink && (
                  <div className="mt-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm">
                    <p className="font-semibold mb-1">Development mode — email is not configured</p>
                    <p className="text-xs mb-3">
                      No SMTP provider is set up in this build, so the backend returned the single-use
                      reset token instead of sending an email. It expires in 60 minutes.
                    </p>
                    <button
                      onClick={copyLink}
                      className="w-full inline-flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-800 py-2 rounded-lg hover:bg-amber-100 transition-colors font-semibold text-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Link copied' : 'Copy reset link'}
                    </button>
                    <button
                      onClick={() => onNavigate('reset-password')}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors font-semibold text-xs"
                    >
                      Continue to reset password
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onNavigate('login')}
                  className="w-full mt-6 inline-flex items-center justify-center gap-2 border border-brand-200 text-brand-600 py-3 rounded-xl hover:bg-brand-50 transition-colors font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800">Forgot Password?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your account email and we'll send recovery instructions.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(true)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                          touched && !isValid ? 'border-brand-500' : 'border-gray-200'
                        }`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {touched && !isValid && (
                      <p className="text-xs text-brand-600 mt-1">Please enter a valid email address.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all font-semibold shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        Send Reset Instructions <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                  Remembered your password?{' '}
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
};

export default ForgotPassword;
