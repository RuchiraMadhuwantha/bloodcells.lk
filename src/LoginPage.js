import React, { useState } from 'react';
import { Droplet } from 'lucide-react';

export const LoginPage = ({ onLogin, onNavigate }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '', role: 'donor' });
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Droplet className="text-red-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 text-sm mt-1">Login to access your portal</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={credentials.email} onChange={e => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login As</label>
            <select value={credentials.role} onChange={e => setCredentials({ ...credentials, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="donor">Donor</option>
              <option value="hospital">Hospital</option>
              <option value="bloodbank">Blood Bank</option>
            </select>
          </div>
          <button onClick={() => onLogin(credentials.role)} className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">Login</button>
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account? <button onClick={() => onNavigate('register')} className="text-red-600 hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
};
