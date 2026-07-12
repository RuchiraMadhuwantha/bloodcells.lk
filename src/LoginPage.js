import React, { useState } from 'react';
import { Droplet } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4 shadow-lg">
            <Droplet className="text-white fill-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">BloodCells<span className="text-red-600">.lk</span></h1>
          <p className="text-gray-600 text-sm mt-1">Login to access your portal</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Enter your username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="••••••••" />
          </div>
          <button onClick={handleLogin} disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-70">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 mt-4">
          <p className="font-semibold">Blood Bank demo access</p>
          <p className="mt-1">Username: <span className="font-mono">bloodbank_admin</span></p>
          <p>Password: <span className="font-mono">NBTS@BloodBank2026!</span></p>
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account? <button onClick={() => onNavigate('register')} className="text-red-600 hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
};
