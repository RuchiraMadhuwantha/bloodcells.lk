import React, { useState } from 'react';
import { Menu, X, Droplet, Bell, LogOut, Heart, AlertCircle, Calendar } from 'lucide-react';
import { FloatingChat } from './FloatingChat';

export const Sidebar = ({ portal, items, current, onNavigate, open, onClose }) => (
  <>
    {/* Mobile overlay */}
    {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />}
    <aside
      className={`fixed md:static z-40 inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center">
          <Droplet className="w-5 h-5 text-white fill-white" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-gray-800">BloodCells<span className="text-brand-600">.lk</span></p>
          <p className="text-[11px] text-gray-500">{portal}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map(item => {
          const active = current === item.route;
          return (
            <button
              key={item.route}
              onClick={() => { onNavigate(item.route); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active ? 'bg-brand-600 text-white shadow' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="bg-brand-50 rounded-lg p-3 text-center">
          <Heart className="w-6 h-6 text-brand-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Every drop counts.</p>
        </div>
      </div>
    </aside>
  </>
);

export const Topbar = ({ title, subtitle, userName, role, onLogout, onMenu }) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = [
    { icon: AlertCircle, color: 'text-brand-600', text: 'Emergency O− request from Colombo General', time: '2m' },
    { icon: Calendar, color: 'text-blue-600', text: 'Appointment confirmed for Jun 18', time: '1h' },
    { icon: Droplet, color: 'text-amber-600', text: 'AB− stock fell below threshold', time: '3h' },
  ];
  return (
    <header className="h-16 bg-brand-600 text-white shadow-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button className="md:hidden" onClick={onMenu}><Menu className="w-6 h-6" /></button>
        <div>
          <h1 className="font-bold text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-white/80">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <button onClick={() => setNotifOpen(o => !o)} className="relative p-2 hover:bg-brand-700 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white text-gray-700 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Notifications</div>
              {notifications.map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                  <n.icon className={`w-5 h-5 mt-0.5 ${n.color}`} />
                  <div className="flex-1">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-xs text-gray-400">{n.time} ago</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm">
            {userName.split(' ').map(s => s[0]).join('').slice(0, 2)}
          </div>
          <div className="leading-tight text-right">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-[11px] text-white/80">{role}</p>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 hover:bg-brand-700 rounded-lg" title="Logout"><LogOut className="w-5 h-5" /></button>
      </div>
    </header>
  );
};

export const DashboardLayout = ({ portal, items, current, onNavigate, title, subtitle, userName, role, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar portal={portal} items={items} current={current} onNavigate={onNavigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} userName={userName} role={role} onLogout={onLogout} onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <FloatingChat />
    </div>
  );
};
