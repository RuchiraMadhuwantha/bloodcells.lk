import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Card — same surface treatment as the homepage stat/service cards.
export const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>{children}</div>
);

// SectionCard — card with a title row + optional action (used across dashboards).
export const SectionCard = ({ title, action, className = '', children }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h2 className="text-lg font-bold text-gray-800">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </div>
);

// StatCard — mirrors the homepage stats grid (icon chip + big value + label + trend).
export const StatCard = ({ icon: Icon, value, label, trend, accent = 'red' }) => {
  const accents = {
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    pink: 'bg-pink-100 text-pink-600',
  };
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 flex items-center ${trend.up ? 'text-green-600' : 'text-red-600'}`}>
              {trend.up ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {trend.value}
            </p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${accents[accent]}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
};

// Badge — same pill style as the homepage request table.
export const Badge = ({ children, color = 'red' }) => {
  const colors = {
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colors[color]}`}>{children}</span>;
};

// BloodTypeBadge — the recurring round blood-group token in red branding.
export const BloodTypeBadge = ({ group, size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-base', lg: 'w-20 h-20 text-2xl' };
  return (
    <div className={`${sizes[size]} bg-red-600 text-white rounded-full flex items-center justify-center font-bold shadow`}>
      {group}
    </div>
  );
};

// ProgressBar — stock-level meter; turns amber/red when low.
export const ProgressBar = ({ value, max = 100 }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct < 25 ? 'bg-red-600' : pct < 50 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// Primary / outline buttons matching homepage.
export const Button = ({ variant = 'primary', icon: Icon, className = '', children, ...props }) => {
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-red-600 text-red-600 hover:bg-red-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    dark: 'bg-gray-900 text-white hover:bg-gray-800',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// Table — stock-level meter; turns amber/red when low.
export const Table = ({ columns, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((c, i) => (
            <th key={i} className="px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">{children}</tbody>
    </table>
  </div>
);
