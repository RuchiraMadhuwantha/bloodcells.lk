import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, Droplet, Hospital, Users, Calendar, Heart, Activity, MapPin, Phone, Mail,
  ChevronRight, Menu, X, LayoutDashboard, User, Bell, LogOut, Search, Plus,
  Filter, TrendingUp, TrendingDown, Bot, Send, Sparkles, Clock, CheckCircle,
  FileText, Building2, ShieldCheck, Edit, Download, Stethoscope, ClipboardList,
  Syringe, MessageSquare, Award, Zap, Database, AlertTriangle
} from 'lucide-react';
import AboutPage from './AboutPage';
import ServicesPage from './ServicesPage';
import EventsNewsPage from './EventsNewsPage';
import ForDonorsPage from './ForDonorsPage';
import ContactUsPage from './ContactUsPage';

/* ===================================================================================
   DESIGN SYSTEM TOKENS  (extracted from the existing homepage — DO NOT redesign)
   Primary red-600 (#dc2626) / red-900 (#991b1b) · white & gray-50 surfaces ·
   gray-900 footer · gray-800 headings · gray-600 body · rounded-lg cards · lucide icons
   =================================================================================== */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/* -------------------------------- Shared UI primitives ---------------------------- */

// Card — same surface treatment as the homepage stat/service cards.
const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>{children}</div>
);

// SectionCard — card with a title row + optional action (used across dashboards).
const SectionCard = ({ title, action, className = '', children }) => (
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
const StatCard = ({ icon: Icon, value, label, trend, accent = 'red' }) => {
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
const Badge = ({ children, color = 'red' }) => {
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
const BloodTypeBadge = ({ group, size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-base', lg: 'w-20 h-20 text-2xl' };
  return (
    <div className={`${sizes[size]} bg-red-600 text-white rounded-full flex items-center justify-center font-bold shadow`}>
      {group}
    </div>
  );
};

// ProgressBar — stock-level meter; turns amber/red when low.
const ProgressBar = ({ value, max = 100 }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct < 25 ? 'bg-red-600' : pct < 50 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// Primary / outline buttons matching homepage.
const Button = ({ variant = 'primary', icon: Icon, className = '', children, ...props }) => {
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

/* -------------------------------- Lightweight SVG charts -------------------------- */
/* No chart library is added — these inline SVG/flex charts keep the red-and-white theme. */

const BarChart = ({ data, height = 160, color = '#dc2626' }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-xs font-medium text-gray-700 mb-1">{d.value}</span>
          <div
            className="w-full rounded-t-md transition-all hover:opacity-80"
            style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: 4 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-xs text-gray-500 mt-2">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const LineChart = ({ data, height = 180, stroke = '#dc2626', forecastFrom }) => {
  const w = 520, pad = 24;
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const x = i => pad + (i * (w - pad * 2)) / (data.length - 1);
  const y = v => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={height - pad - g * (height - pad * 2)} y2={height - pad - g * (height - pad * 2)} stroke="#f3f4f6" />
      ))}
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill={forecastFrom != null && i >= forecastFrom ? '#fff' : stroke} stroke={stroke} strokeWidth="2" />
          <text x={x(i)} y={height - 6} textAnchor="middle" fontSize="9" fill="#6b7280">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

const Donut = ({ segments, size = 140 }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 12, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
        offset += len;
        return el;
      })}
      <text x="50%" y="48%" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">{total}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="9" fill="#6b7280">units</text>
    </svg>
  );
};

/* -------------------------------- Tables ------------------------------------------ */

const Table = ({ columns, children }) => (
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

/* ===================================================================================
   AI CHAT ASSISTANT — floating widget available across every portal.
   Avatar · suggested prompts · history · quick actions.
   =================================================================================== */

const SUGGESTED_PROMPTS = [
  'Am I eligible to donate now?',
  'Which blood groups are low this week?',
  'How do I raise an emergency request?',
  'Show nearest donation centers',
];

const cannedReply = (text) => {
  const t = text.toLowerCase();
  if (t.includes('eligible')) return 'Based on your last donation (Mar 12, 2026), you become eligible again on Jun 16, 2026 — that\'s today! You can book an appointment now.';
  if (t.includes('low') || t.includes('shortage')) return 'This week O− and B− are critically low (under 25% capacity). I\'d recommend prioritizing campaigns for these groups.';
  if (t.includes('emergency')) return 'Go to the Hospital Portal → New Blood Request, set Priority to "Emergency", and the request is broadcast instantly to all regional blood banks.';
  if (t.includes('center') || t.includes('near')) return 'Nearest centers: NBTS Colombo (2.1 km), Kurunegala RBC (4.8 km), Anuradhapura RBC (6.3 km). Want me to open the booking calendar?';
  return 'I can help with eligibility, appointments, emergency requests, inventory levels and demand forecasts. Try one of the suggested prompts below.';
};

const FloatingChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Hi! I\'m PRAANA Assistant 🩸 — your AI helper for donations, requests and inventory. How can I help today?' },
  ]);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setMessages(m => [...m, { from: 'user', text: value }]);
    setInput('');
    setTimeout(() => setMessages(m => [...m, { from: 'ai', text: cannedReply(value) }]), 450);
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Open AI assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[22rem] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: 520 }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold leading-tight">PRAANA Assistant</p>
              <p className="text-xs text-white/80 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> Online · AI powered</p>
            </div>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'ai' && <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mr-2 shrink-0"><Bot className="w-4 h-4 text-red-600" /></div>}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.from === 'user' ? 'bg-red-600 text-white rounded-br-sm' : 'bg-white text-gray-700 shadow-sm rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Suggested prompts (quick actions) */}
          <div className="px-3 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)} className="whitespace-nowrap text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything…"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button onClick={() => send()} className="w-9 h-9 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/* ===================================================================================
   DASHBOARD SHELL — persistent left Sidebar + red Topbar + floating AI chat.
   =================================================================================== */

const Sidebar = ({ portal, items, current, onNavigate, open, onClose }) => (
  <>
    {/* Mobile overlay */}
    {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />}
    <aside
      className={`fixed md:static z-40 inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center">
          <Droplet className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-gray-800">NBTS</p>
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
                ${active ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <Heart className="w-6 h-6 text-red-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Every drop counts.</p>
        </div>
      </div>
    </aside>
  </>
);

const Topbar = ({ title, subtitle, userName, role, onLogout, onMenu }) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = [
    { icon: AlertCircle, color: 'text-red-600', text: 'Emergency O− request from Colombo General', time: '2m' },
    { icon: Calendar, color: 'text-blue-600', text: 'Appointment confirmed for Jun 18', time: '1h' },
    { icon: Droplet, color: 'text-amber-600', text: 'AB− stock fell below threshold', time: '3h' },
  ];
  return (
    <header className="h-16 bg-red-600 text-white shadow-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button className="md:hidden" onClick={onMenu}><Menu className="w-6 h-6" /></button>
        <div>
          <h1 className="font-bold text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-white/80">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <button onClick={() => setNotifOpen(o => !o)} className="relative p-2 hover:bg-red-700 rounded-lg">
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
        <button onClick={onLogout} className="p-2 hover:bg-red-700 rounded-lg" title="Logout"><LogOut className="w-5 h-5" /></button>
      </div>
    </header>
  );
};

const DashboardLayout = ({ portal, items, current, onNavigate, title, subtitle, userName, role, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar portal={portal} items={items} current={current} onNavigate={onNavigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} userName={userName} role={role} onLogout={onLogout} onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <FloatingChat />
    </div>
  );
};

/* Sidebar item sets per portal */
const DONOR_NAV = [
  { route: 'donor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'donor-appointment', label: 'Book Appointment', icon: Calendar },
  { route: 'donor-profile', label: 'My Profile', icon: User },
];
const HOSPITAL_NAV = [
  { route: 'hospital-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'hospital-request', label: 'New Blood Request', icon: ClipboardList },
];
const BANK_NAV = [
  { route: 'bank-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'bank-inventory', label: 'Inventory', icon: Database },
  { route: 'bank-donors', label: 'Donors', icon: Users },
  { route: 'bank-prediction', label: 'AI Demand Prediction', icon: Sparkles },
];
const ADMIN_NAV = [
  { route: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'bank-prediction', label: 'AI Demand Prediction', icon: Sparkles },
];

/* ===================================================================================
   PUBLIC PAGES — Homepage (existing, with navbar + hero + sections) + Login + Register
   =================================================================================== */

const Homepage = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { title: "Welcome To Blood Donation System", subtitle: "National Blood Transfusion Service", location: "Sri Lanka", image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" },
    { title: "Save Lives, Donate Blood", subtitle: "Every Drop Counts", location: "Join Our Mission", image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" },
    { title: "Emergency Blood Requests", subtitle: "Real-Time Coordination", location: "Fast & Efficient", image: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const stats = [
    { icon: Droplet, value: "10,000+", label: "Blood Donations", color: "text-red-600" },
    { icon: Users, value: "5,000+", label: "Active Donors", color: "text-blue-600" },
    { icon: Hospital, value: "50+", label: "Partner Hospitals", color: "text-green-600" },
    { icon: Heart, value: "15,000+", label: "Lives Saved", color: "text-pink-600" },
  ];

  const services = [
    { icon: Activity, title: "Blood Inventory Management", description: "Real-time tracking of blood availability across all regional centers" },
    { icon: AlertCircle, title: "Emergency Requests", description: "Priority handling for urgent blood requirements with instant notifications" },
    { icon: Calendar, title: "Donation Campaigns", description: "Organized blood donation drives with automated donor notifications" },
    { icon: MapPin, title: "Regional Coordination", description: "Efficient blood transfer between regions based on demand and availability" },
  ];

  const howItWorks = [
    { icon: User, title: "Register", description: "Create your donor profile in minutes" },
    { icon: Calendar, title: "Book a Slot", description: "Choose a nearby center and time" },
    { icon: Droplet, title: "Donate", description: "A safe, 15-minute process" },
    { icon: Heart, title: "Save Lives", description: "Track the impact of every donation" },
  ];

  const campaigns = [
    { title: "Colombo Mega Blood Drive", date: "Jun 24, 2026", place: "BMICH, Colombo", tag: "Upcoming" },
    { title: "University of Kelaniya Camp", date: "Jul 02, 2026", place: "Kelaniya", tag: "Registering" },
    { title: "Corporate Donation Week", date: "Jul 15, 2026", place: "World Trade Center", tag: "Upcoming" },
  ];

  const testimonials = [
    { name: "Nimal Perera", role: "Donor · 24 donations", quote: "The booking process is effortless and I love seeing how many lives I've helped." },
    { name: "Dr. Samanthi Silva", role: "Colombo General Hospital", quote: "Emergency requests now reach blood banks in seconds. It has genuinely saved lives." },
    { name: "Kasun Fernando", role: "First-time donor", quote: "PRAANA's assistant guided me through eligibility — I was donating within a week." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Slider */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        {slides.map((slide, index) => (
          <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`} style={{ background: slide.image }}>
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center">
              <div className="text-white max-w-2xl">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">{slide.title}</h1>
                <p className="text-xl md:text-2xl mb-2">{slide.subtitle}</p>
                <p className="text-lg mb-6">{slide.location}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => onNavigate('register')} className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 flex items-center justify-center">
                    Become a Donor <ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                  <button onClick={() => onNavigate('login')} className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all">
                    Request Blood
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button key={index} onClick={() => setCurrentSlide(index)} className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50'}`} />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 text-center">
                <stat.icon className={`w-12 h-12 mx-auto mb-3 ${stat.color}`} />
                <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Comprehensive blood donation and transfusion management services for efficient healthcare delivery</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg border-2 border-gray-100 hover:border-red-300 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
                  <service.icon className="w-7 h-7 text-red-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-gray-600">Donating blood is simple, safe and rewarding.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div key={i} className="relative bg-white p-6 rounded-lg shadow-md text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-7 h-7 text-red-600" />
                </div>
                <div className="absolute top-4 right-4 text-3xl font-bold text-red-100">{i + 1}</div>
                <h3 className="font-semibold text-gray-800 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-white">
            <AlertCircle className="w-12 h-12 shrink-0 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold">Urgent: O− and B− needed now</h3>
              <p className="text-white/90 text-sm">Critical shortage across Colombo region. Your donation today can save a life immediately.</p>
            </div>
          </div>
          <button onClick={() => onNavigate('login')} className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 whitespace-nowrap">
            Respond to Emergency
          </button>
        </div>
      </div>

      {/* Campaigns */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Upcoming Campaigns</h2>
            <p className="text-gray-600">Join a blood donation drive near you.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {campaigns.map((c, i) => (
              <div key={i} className="bg-white rounded-lg border-2 border-gray-100 hover:border-red-300 hover:shadow-lg transition-all overflow-hidden">
                <div className="h-28 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                  <Droplet className="w-12 h-12 text-white/80" />
                </div>
                <div className="p-5">
                  <Badge color="red">{c.tag}</Badge>
                  <h3 className="font-semibold text-gray-800 mt-3 mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-2 mb-1"><Calendar className="w-4 h-4" /> {c.date}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4" /> {c.place}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">What People Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 italic mb-4">“{t.quote}”</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold">
                    {t.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-red-600 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Save Lives?</h2>
          <p className="text-white/90 mb-8 text-lg">Join thousands of donors making a difference every day</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => onNavigate('register')} className="px-8 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">Become a Donor</button>
            <button onClick={() => onNavigate('login')} className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all">Login to Portal</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Droplet className="w-8 h-8 text-red-600" />
                <span className="text-xl font-bold">NBTS</span>
              </div>
              <p className="text-gray-400 text-sm">National Blood Transfusion Service - Sri Lanka</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <button onClick={() => onNavigate('about')} className="hover:text-white cursor-pointer">About Us</button>
                <button onClick={() => onNavigate('services')} className="hover:text-white cursor-pointer">Services</button>
                <button onClick={() => onNavigate('register')} className="hover:text-white cursor-pointer">Donate Blood</button>
                <button onClick={() => onNavigate('events')} className="hover:text-white cursor-pointer">Events</button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center"><Phone className="w-4 h-4 mr-2" />+94 11 269 5671</div>
                <div className="flex items-center"><Mail className="w-4 h-4 mr-2" />info@nbts.health.gov.lk</div>
                <div className="flex items-center"><MapPin className="w-4 h-4 mr-2" />Colombo, Sri Lanka</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Locations</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Kurunegala District</div>
                <div>Anuradhapura District</div>
                <div>Regional Blood Centers</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2026 National Blood Transfusion Service. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const LoginPage = ({ onLogin, onNavigate }) => {
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
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button onClick={() => onLogin(credentials.role)} className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">Login</button>
        </div>
        <div className="mt-6 text-center">
          <button onClick={() => onNavigate('home')} className="text-sm text-gray-600 hover:text-red-600">← Back to Home</button>
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account? <button onClick={() => onNavigate('register')} className="text-red-600 hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = ({ onNavigate }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', group: 'O+', password: '' });
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Heart className="text-red-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Become a Donor</h1>
          <p className="text-gray-600 text-sm mt-1">Join the mission to save lives</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="+94…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="••••••••" />
          </div>
          <button onClick={() => onNavigate('login')} className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">Create Account</button>
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Already registered? <button onClick={() => onNavigate('login')} className="text-red-600 hover:underline font-medium">Login</button>
        </p>
      </div>
    </div>
  );
};

/* ===================================================================================
   DONOR PORTAL — Dashboard · Appointment Booking · Profile
   =================================================================================== */

const DonorDashboard = ({ nav }) => {
  const history = [
    { label: 'Jan', value: 1 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 1 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 1 }, { label: 'Jun', value: 1 },
  ];
  return (
    <DashboardLayout {...nav} title="Donor Dashboard" subtitle="Welcome back, Nimal" userName="Nimal Perera" role="Donor · O+">
      {/* Eligibility banner */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-12 h-12" />
          <div>
            <h2 className="text-xl font-bold">You are eligible to donate</h2>
            <p className="text-white/90 text-sm">Your last donation was 96 days ago. Thank you for saving lives!</p>
          </div>
        </div>
        <Button variant="primary" className="bg-white text-green-700 hover:bg-gray-100" icon={Calendar} onClick={() => nav.onNavigate('donor-appointment')}>Book Appointment</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Droplet} value="12" label="Total Donations" accent="red" trend={{ up: true, value: '+1 this year' }} />
        <StatCard icon={Heart} value="36" label="Lives Impacted" accent="pink" />
        <StatCard icon={Calendar} value="Jun 16" label="Next Eligible Date" accent="green" />
        <StatCard icon={Award} value="Gold" label="Donor Tier" accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* History chart */}
        <SectionCard title="Donation History" className="lg:col-span-2" action={<Badge color="gray">Last 6 months</Badge>}>
          <BarChart data={history} />
        </SectionCard>

        {/* Upcoming appointment */}
        <SectionCard title="Upcoming Appointment">
          <div className="border border-red-100 bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600 font-semibold"><Calendar className="w-5 h-5" /> Jun 18, 2026</div>
            <p className="text-sm text-gray-600 mt-2 flex items-center gap-2"><Clock className="w-4 h-4" /> 10:30 AM</p>
            <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4" /> NBTS Colombo</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 text-xs">Reschedule</Button>
              <Button variant="ghost" className="flex-1 text-xs text-red-600">Cancel</Button>
            </div>
          </div>
        </SectionCard>

        {/* Emergency requests */}
        <SectionCard title="Emergency Requests Near You" className="lg:col-span-2">
          <div className="space-y-3">
            {[
              { hospital: 'Colombo General Hospital', group: 'O+', dist: '2.1 km', urgent: true },
              { hospital: 'Kurunegala Teaching Hospital', group: 'O+', dist: '5.4 km', urgent: false },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <BloodTypeBadge group={r.group} size="sm" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{r.hospital}</p>
                    <p className="text-xs text-gray-500">{r.dist} away · matches your group</p>
                  </div>
                </div>
                {r.urgent ? <Badge color="red">Urgent</Badge> : <Badge color="yellow">Needed</Badge>}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Recommendations */}
        <SectionCard title="Recommended For You">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-red-600 mt-0.5" /> O+ is in high demand this week — your donation is impactful.</li>
            <li className="flex items-start gap-2"><Calendar className="w-4 h-4 text-red-600 mt-0.5" /> Colombo Mega Blood Drive on Jun 24 is near you.</li>
            <li className="flex items-start gap-2"><Heart className="w-4 h-4 text-red-600 mt-0.5" /> 1 more donation reaches your Platinum tier.</li>
          </ul>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

const AppointmentBooking = ({ nav }) => {
  const [selectedDate, setSelectedDate] = useState(18);
  const [selectedCenter, setSelectedCenter] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const centers = [
    { name: 'NBTS Colombo', addr: 'Narahenpita, Colombo 05', dist: '2.1 km' },
    { name: 'Kurunegala RBC', addr: 'Hospital Rd, Kurunegala', dist: '4.8 km' },
    { name: 'Anuradhapura RBC', addr: 'Maithripala Rd', dist: '6.3 km' },
  ];
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  if (confirmed) {
    return (
      <DashboardLayout {...nav} title="Appointment Booking" userName="Nimal Perera" role="Donor · O+">
        <Card className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h2>
          <p className="text-gray-600 mb-6">We've reserved your slot and sent a confirmation to your email.</p>
          <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
            <p className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium">{centers[selectedCenter].name}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">Jun {selectedDate}, 2026</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedSlot}</span></p>
          </div>
          <Button onClick={() => nav.onNavigate('donor-dashboard')} icon={LayoutDashboard}>Back to Dashboard</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...nav} title="Book Appointment" subtitle="Choose a center, date and time" userName="Nimal Perera" role="Donor · O+">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Centers */}
          <SectionCard title="Select Donation Center">
            <div className="space-y-3">
              {centers.map((c, i) => (
                <button key={i} onClick={() => setSelectedCenter(i)}
                  className={`w-full flex items-center justify-between border rounded-lg p-4 text-left transition-colors ${selectedCenter === i ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}>
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 ${selectedCenter === i ? 'text-red-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.addr}</p>
                    </div>
                  </div>
                  <Badge color="gray">{c.dist}</Badge>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Calendar */}
          <SectionCard title="Select Date — June 2026">
            <div className="grid grid-cols-7 gap-2 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-xs font-medium text-gray-400 py-1">{d}</div>)}
              {days.map(d => {
                const disabled = d < 16;
                return (
                  <button key={d} disabled={disabled} onClick={() => setSelectedDate(d)}
                    className={`aspect-square rounded-lg text-sm transition-colors
                      ${disabled ? 'text-gray-300 cursor-not-allowed' : selectedDate === d ? 'bg-red-600 text-white font-semibold' : 'hover:bg-red-50 text-gray-700'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Slots */}
          <SectionCard title="Available Time Slots">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map(s => (
                <button key={s} onClick={() => setSelectedSlot(s)}
                  className={`py-2 rounded-lg text-sm border transition-colors ${selectedSlot === s ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Summary */}
        <div>
          <SectionCard title="Booking Summary" className="sticky top-20">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Donor</span><span className="font-medium">Nimal Perera</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Blood Group</span><BloodTypeBadge group="O+" size="sm" /></div>
              <hr />
              <div className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium text-right">{centers[selectedCenter].name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">Jun {selectedDate}, 2026</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedSlot || '—'}</span></div>
            </div>
            <Button onClick={() => selectedSlot && setConfirmed(true)} disabled={!selectedSlot}
              className={`w-full mt-6 ${!selectedSlot ? 'opacity-50 cursor-not-allowed' : ''}`}>Confirm Booking</Button>
            <p className="text-xs text-gray-400 text-center mt-3">You can reschedule up to 24h before.</p>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

const DonorProfile = ({ nav }) => (
  <DashboardLayout {...nav} title="My Profile" userName="Nimal Perera" role="Donor · O+">
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Profile card */}
      <Card className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">NP</div>
        <h2 className="text-xl font-bold text-gray-800">Nimal Perera</h2>
        <p className="text-gray-500 text-sm">Donor since 2019</p>
        <div className="flex justify-center my-4"><BloodTypeBadge group="O+" size="lg" /></div>
        <Badge color="amber">Gold Tier Donor</Badge>
        <Button variant="outline" icon={Edit} className="w-full mt-6">Edit Profile</Button>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        {/* Donation statistics */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Droplet} value="12" label="Donations" accent="red" />
          <StatCard icon={Heart} value="36" label="Lives Saved" accent="pink" />
          <StatCard icon={Calendar} value="96d" label="Since Last" accent="blue" />
        </div>

        {/* Personal details */}
        <SectionCard title="Personal Details">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              ['Full Name', 'Nimal Perera'], ['Date of Birth', '12 Mar 1990'],
              ['Gender', 'Male'], ['NIC', '199012345678'],
              ['Weight', '74 kg'], ['Height', '176 cm'],
            ].map(([k, v]) => (
              <div key={k}><p className="text-gray-400">{k}</p><p className="font-medium text-gray-800">{v}</p></div>
            ))}
          </div>
        </SectionCard>

        {/* Medical info */}
        <SectionCard title="Medical Information">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-400">Allergies</p><p className="font-medium text-gray-800">None reported</p></div>
            <div><p className="text-gray-400">Chronic Conditions</p><p className="font-medium text-gray-800">None</p></div>
            <div><p className="text-gray-400">Last Hemoglobin</p><p className="font-medium text-gray-800">14.6 g/dL</p></div>
            <div><p className="text-gray-400">Eligibility</p><Badge color="green">Eligible</Badge></div>
          </div>
        </SectionCard>

        {/* Contact details */}
        <SectionCard title="Contact Details">
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-3 text-gray-700"><Phone className="w-4 h-4 text-red-600" /> +94 77 123 4567</p>
            <p className="flex items-center gap-3 text-gray-700"><Mail className="w-4 h-4 text-red-600" /> nimal.perera@email.com</p>
            <p className="flex items-center gap-3 text-gray-700"><MapPin className="w-4 h-4 text-red-600" /> 42 Galle Rd, Colombo 03</p>
          </div>
        </SectionCard>
      </div>
    </div>
  </DashboardLayout>
);

/* ===================================================================================
   HOSPITAL PORTAL — Dashboard · Blood Request page
   =================================================================================== */

const HospitalDashboard = ({ nav }) => {
  const requests = [
    { id: 1024, type: 'Emergency', group: 'O+', units: 3, status: 'Pending', date: 'Jun 16' },
    { id: 1023, type: 'Normal', group: 'A+', units: 2, status: 'Approved', date: 'Jun 15' },
    { id: 1022, type: 'Normal', group: 'B-', units: 1, status: 'Approved', date: 'Jun 14' },
    { id: 1021, type: 'Emergency', group: 'AB+', units: 2, status: 'Rejected', date: 'Jun 13' },
  ];
  const availability = [
    { group: 'O+', units: 48 }, { group: 'O-', units: 12 }, { group: 'A+', units: 33 }, { group: 'A-', units: 9 },
    { group: 'B+', units: 27 }, { group: 'B-', units: 6 }, { group: 'AB+', units: 15 }, { group: 'AB-', units: 4 },
  ];
  const surgeries = [
    { time: '08:00', proc: 'Cardiac bypass', group: 'O+', units: 2 },
    { time: '11:30', proc: 'Orthopedic', group: 'A+', units: 1 },
    { time: '15:00', proc: 'Trauma (ER)', group: 'O-', units: 3 },
  ];
  const usage = [
    { label: 'Mon', value: 6 }, { label: 'Tue', value: 9 }, { label: 'Wed', value: 4 },
    { label: 'Thu', value: 11 }, { label: 'Fri', value: 7 }, { label: 'Sat', value: 5 }, { label: 'Sun', value: 3 },
  ];

  return (
    <DashboardLayout {...nav} title="Hospital Dashboard" subtitle="Colombo General Hospital" userName="Dr. Samanthi Silva" role="Hospital Admin">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value="158" label="Units In Stock" accent="green" />
        <StatCard icon={Clock} value="1" label="Pending Requests" accent="amber" />
        <StatCard icon={CheckCircle} value="2" label="Approved" accent="blue" />
        <StatCard icon={AlertCircle} value="1" label="Emergency" accent="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Weekly Transfusion Usage" className="lg:col-span-2">
          <BarChart data={usage} />
        </SectionCard>
        <SectionCard title="Surgery Schedule" action={<Badge color="gray">Today</Badge>}>
          <div className="space-y-3">
            {surgeries.map((s, i) => (
              <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
                <div className="text-sm font-semibold text-red-600 w-12">{s.time}</div>
                <Stethoscope className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.proc}</p>
                  <p className="text-xs text-gray-500">{s.group} · {s.units} units</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Blood availability */}
      <SectionCard title="Blood Availability" className="mb-6" action={<Badge color="gray">Linked blood bank</Badge>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {availability.map(a => (
            <div key={a.group} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <BloodTypeBadge group={a.group} size="sm" />
                <span className="text-sm font-bold text-gray-800">{a.units}</span>
              </div>
              <ProgressBar value={a.units} max={50} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Recent requests */}
      <SectionCard title="Recent Requests" action={<Button icon={Plus} onClick={() => nav.onNavigate('hospital-request')}>New Request</Button>}>
        <Table columns={['Request', 'Type', 'Blood Group', 'Units', 'Status', 'Date']}>
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">#{r.id}</td>
              <td className="px-4 py-3"><Badge color={r.type === 'Emergency' ? 'red' : 'blue'}>{r.type}</Badge></td>
              <td className="px-4 py-3 font-medium">{r.group}</td>
              <td className="px-4 py-3 text-sm">{r.units}</td>
              <td className="px-4 py-3"><Badge color={r.status === 'Approved' ? 'green' : r.status === 'Pending' ? 'yellow' : 'red'}>{r.status}</Badge></td>
              <td className="px-4 py-3 text-sm text-gray-500">{r.date}</td>
            </tr>
          ))}
        </Table>
      </SectionCard>
    </DashboardLayout>
  );
};

const BloodRequestPage = ({ nav }) => {
  const [form, setForm] = useState({ group: 'O+', units: 2, priority: 'Normal', date: '', dept: 'Emergency', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <DashboardLayout {...nav} title="Blood Request" userName="Dr. Samanthi Silva" role="Hospital Admin">
        <Card className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted</h2>
          <p className="text-gray-600 mb-6">Request <span className="font-semibold">#1025</span> sent to the regional blood bank{form.priority === 'Emergency' && ' and broadcast as an emergency'}.</p>
          <Button onClick={() => nav.onNavigate('hospital-dashboard')} icon={LayoutDashboard}>Back to Dashboard</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...nav} title="New Blood Request" subtitle="Request blood units from the regional bank" userName="Dr. Samanthi Silva" role="Hospital Admin">
      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Request Details" className="lg:col-span-2">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {BLOOD_GROUPS.map(g => (
                  <button key={g} onClick={() => setForm({ ...form, group: g })}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${form.group === g ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (units)</label>
                <input type="number" min="1" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                {['Normal', 'Urgent', 'Emergency'].map(p => (
                  <button key={p} onClick={() => setForm({ ...form, priority: p })}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors
                      ${form.priority === p ? (p === 'Emergency' ? 'bg-red-600 text-white border-red-600' : p === 'Urgent' ? 'bg-amber-500 text-white border-amber-500' : 'bg-blue-600 text-white border-blue-600') : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                {['Emergency', 'Surgery', 'ICU', 'Oncology', 'Maternity', 'General Ward'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Patient condition, special handling…"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
        </SectionCard>

        <div>
          <SectionCard title="Request Summary" className="sticky top-20">
            <div className="flex justify-center mb-4"><BloodTypeBadge group={form.group} size="lg" /></div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-medium">{form.units} units</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span>
                <Badge color={form.priority === 'Emergency' ? 'red' : form.priority === 'Urgent' ? 'amber' : 'blue'}>{form.priority}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">Required</span><span className="font-medium">{form.date || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium">{form.dept}</span></div>
            </div>
            {form.priority === 'Emergency' && (
              <div className="mt-4 bg-red-50 text-red-700 text-xs rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> Emergency requests are broadcast instantly to all regional banks.
              </div>
            )}
            <Button onClick={() => setSubmitted(true)} className="w-full mt-6" icon={Send}>Submit Request</Button>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

/* ===================================================================================
   BLOOD BANK PORTAL — Dashboard · Inventory Management · Donor Management
   =================================================================================== */

const BankDashboard = ({ nav }) => {
  const inventory = BLOOD_GROUPS.map((g, i) => ({ group: g, units: [62, 14, 41, 11, 78, 8, 23, 5][i] }));
  const donations = [
    { donor: 'Nimal Perera', group: 'O+', date: 'Jun 16', units: 1 },
    { donor: 'Kasun Fernando', group: 'A+', date: 'Jun 16', units: 1 },
    { donor: ' Amali Jay.', group: 'B-', date: 'Jun 15', units: 1 },
  ];
  const queue = [
    { hospital: 'Colombo General', group: 'O+', units: 3, priority: 'Emergency' },
    { hospital: 'Kandy Teaching', group: 'A+', units: 2, priority: 'Normal' },
    { hospital: 'Galle DGH', group: 'AB+', units: 1, priority: 'Urgent' },
  ];
  const trend = [
    { label: 'W1', value: 210 }, { label: 'W2', value: 245 }, { label: 'W3', value: 198 },
    { label: 'W4', value: 268 }, { label: 'W5', value: 242 }, { label: 'W6', value: 289 },
  ];

  return (
    <DashboardLayout {...nav} title="Blood Bank Dashboard" subtitle="NBTS Colombo Regional Center" userName="Ruwan Jayasuriya" role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value="242" label="Total Units" accent="red" trend={{ up: true, value: '+18 this week' }} />
        <StatCard icon={AlertTriangle} value="9" label="Expiring ≤3 days" accent="amber" />
        <StatCard icon={Users} value="5,012" label="Active Donors" accent="blue" />
        <StatCard icon={Clock} value="3" label="Pending Requests" accent="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Inventory overview donut */}
        <SectionCard title="Inventory Overview">
          <div className="flex items-center justify-center">
            <Donut segments={[
              { value: 130, color: '#dc2626' }, { value: 62, color: '#f59e0b' }, { value: 50, color: '#3b82f6' },
            ]} />
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" /> O/A</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> B</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> AB</span>
          </div>
        </SectionCard>

        {/* Collection trend */}
        <SectionCard title="Collection Trend" className="lg:col-span-2" action={<Badge color="gray">6 weeks</Badge>}>
          <LineChart data={trend} />
        </SectionCard>
      </div>

      {/* Stock by group */}
      <SectionCard title="Stock by Blood Group" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {inventory.map(a => (
            <div key={a.group} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <BloodTypeBadge group={a.group} size="sm" />
                <span className={`text-sm font-bold ${a.units < 15 ? 'text-red-600' : 'text-gray-800'}`}>{a.units}</span>
              </div>
              <ProgressBar value={a.units} max={80} />
              {a.units < 15 && <p className="text-[11px] text-red-600 mt-1">Low stock</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Donations" action={<Button variant="ghost" className="text-sm text-red-600" onClick={() => nav.onNavigate('bank-donors')}>View all</Button>}>
          <Table columns={['Donor', 'Group', 'Date', 'Units']}>
            {donations.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{d.donor}</td>
                <td className="px-4 py-3"><Badge color="red">{d.group}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.date}</td>
                <td className="px-4 py-3 text-sm">{d.units}</td>
              </tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Hospital Request Queue">
          <div className="space-y-3">
            {queue.map((q, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <BloodTypeBadge group={q.group} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.hospital}</p>
                    <p className="text-xs text-gray-500">{q.units} units requested</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={q.priority === 'Emergency' ? 'red' : q.priority === 'Urgent' ? 'amber' : 'blue'}>{q.priority}</Badge>
                  <Button className="text-xs px-3 py-1.5">Fulfil</Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

const InventoryManagement = ({ nav }) => {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);

  const units = [
    { id: 'U-7781', group: 'O+', collected: 'Jun 10', expires: 'Jul 22', status: 'Available', donor: 'Nimal P.' },
    { id: 'U-7782', group: 'A+', collected: 'Jun 08', expires: 'Jun 18', status: 'Expiring', donor: 'Kasun F.' },
    { id: 'U-7783', group: 'O-', collected: 'Jun 12', expires: 'Jul 24', status: 'Available', donor: 'Amali J.' },
    { id: 'U-7784', group: 'B+', collected: 'May 30', expires: 'Jun 16', status: 'Expiring', donor: 'Sunil R.' },
    { id: 'U-7785', group: 'AB-', collected: 'Jun 14', expires: 'Jul 26', status: 'Reserved', donor: 'Dilani W.' },
    { id: 'U-7786', group: 'O+', collected: 'Jun 13', expires: 'Jul 25', status: 'Available', donor: 'Tharindu G.' },
  ];
  const filtered = units.filter(u =>
    (groupFilter === 'All' || u.group === groupFilter) &&
    (u.id.toLowerCase().includes(search.toLowerCase()) || u.donor.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout {...nav} title="Inventory Management" subtitle="Blood unit tracking & expiry" userName="Ruwan Jayasuriya" role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value="242" label="Total Units" accent="red" />
        <StatCard icon={CheckCircle} value="206" label="Available" accent="green" />
        <StatCard icon={AlertTriangle} value="9" label="Expiring Soon" accent="amber" />
        <StatCard icon={Syringe} value="27" label="Reserved" accent="blue" />
      </div>

      <SectionCard
        title="Blood Units"
        action={<Button icon={Plus} onClick={() => setShowAdd(true)}>Add Blood Unit</Button>}
      >
        {/* Filters / search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by unit ID or donor…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <Table columns={['Unit ID', 'Group', 'Donor', 'Collected', 'Expires', 'Status', '']}>
          {filtered.map(u => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{u.id}</td>
              <td className="px-4 py-3"><Badge color="red">{u.group}</Badge></td>
              <td className="px-4 py-3 text-sm">{u.donor}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{u.collected}</td>
              <td className="px-4 py-3 text-sm text-gray-500 flex items-center gap-1">
                {u.status === 'Expiring' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}{u.expires}
              </td>
              <td className="px-4 py-3"><Badge color={u.status === 'Available' ? 'green' : u.status === 'Expiring' ? 'amber' : 'blue'}>{u.status}</Badge></td>
              <td className="px-4 py-3 text-right"><button className="text-gray-400 hover:text-red-600"><Edit className="w-4 h-4" /></button></td>
            </tr>
          ))}
        </Table>
      </SectionCard>

      {/* Add unit modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add Blood Unit</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donor ID / Name</label>
                <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="D-1234" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Collected</label>
                  <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ml)</label>
                  <input type="number" defaultValue="450" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => setShowAdd(false)}>Save Unit</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const DonorManagement = ({ nav }) => {
  const [search, setSearch] = useState('');
  const donors = [
    { id: 'D-1001', name: 'Nimal Perera', group: 'O+', last: 'Mar 12, 2026', donations: 12, eligible: true },
    { id: 'D-1002', name: 'Kasun Fernando', group: 'A+', last: 'May 02, 2026', donations: 4, eligible: false },
    { id: 'D-1003', name: 'Amali Jayawardena', group: 'B-', last: 'Jun 15, 2026', donations: 8, eligible: false },
    { id: 'D-1004', name: 'Sunil Rathnayake', group: 'O-', last: 'Feb 20, 2026', donations: 21, eligible: true },
    { id: 'D-1005', name: 'Dilani Wickrama', group: 'AB-', last: 'Jan 10, 2026', donations: 6, eligible: true },
  ];
  const filtered = donors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout {...nav} title="Donor Management" subtitle="Registered donor directory" userName="Ruwan Jayasuriya" role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} value="5,012" label="Total Donors" accent="red" />
        <StatCard icon={CheckCircle} value="3,841" label="Eligible Now" accent="green" />
        <StatCard icon={Award} value="612" label="Gold+ Tier" accent="amber" />
        <StatCard icon={Heart} value="284" label="New This Month" accent="pink" />
      </div>

      <SectionCard
        title="Donors"
        action={<Button variant="outline" icon={Bell}>Notify Eligible</Button>}
      >
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search donors by name or ID…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
        </div>

        <Table columns={['Donor', 'Group', 'Last Donation', 'Donations', 'Eligibility', 'Actions']}>
          {filtered.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    {d.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><Badge color="red">{d.group}</Badge></td>
              <td className="px-4 py-3 text-sm text-gray-500">{d.last}</td>
              <td className="px-4 py-3 text-sm">{d.donations}</td>
              <td className="px-4 py-3"><Badge color={d.eligible ? 'green' : 'gray'}>{d.eligible ? 'Eligible' : 'Resting'}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-red-600" title="Call"><Phone className="w-4 h-4" /></button>
                  <button className="text-gray-400 hover:text-red-600" title="Email"><Mail className="w-4 h-4" /></button>
                  <button className="text-gray-400 hover:text-red-600" title="Notify"><Bell className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </SectionCard>
    </DashboardLayout>
  );
};

/* ===================================================================================
   AI DEMAND PREDICTION MODULE
   =================================================================================== */

const AIPrediction = ({ nav }) => {
  const weekly = [
    { label: 'Mon', value: 38 }, { label: 'Tue', value: 42 }, { label: 'Wed', value: 35 },
    { label: 'Thu', value: 50 }, { label: 'Fri', value: 61 }, { label: 'Sat', value: 47 }, { label: 'Sun', value: 33 },
  ];
  const monthly = [
    { label: 'Jan', value: 980 }, { label: 'Feb', value: 1020 }, { label: 'Mar', value: 1120 },
    { label: 'Apr', value: 1080 }, { label: 'May', value: 1190 }, { label: 'Jun', value: 1240 },
    { label: 'Jul*', value: 1320 }, { label: 'Aug*', value: 1380 },
  ];
  const risk = [
    { group: 'O-', level: 'Critical', forecast: '+38% demand', color: 'red' },
    { group: 'B-', level: 'High', forecast: '+24% demand', color: 'amber' },
    { group: 'AB-', level: 'High', forecast: '+19% demand', color: 'amber' },
    { group: 'O+', level: 'Moderate', forecast: '+11% demand', color: 'yellow' },
  ];

  return (
    <DashboardLayout {...nav} title="AI Demand Prediction" subtitle="Forecasting & shortage alerts" userName="Ruwan Jayasuriya" role="Bank Manager">
      {/* AI insight banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-6 mb-6 flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></div>
        <div>
          <h2 className="text-lg font-bold">AI Insight</h2>
          <p className="text-white/90 text-sm mt-1">
            Demand for <strong>O−</strong> is projected to rise <strong>38%</strong> over the next 7 days driven by scheduled
            trauma surgeries and a regional festival. Current stock covers only <strong>2.3 days</strong>. Launch a targeted
            O− campaign and notify 420 eligible O− donors now.
          </p>
        </div>
      </div>

      {/* Inventory metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp} value="+27%" label="Forecast Demand (7d)" accent="red" trend={{ up: true, value: 'vs last week' }} />
        <StatCard icon={AlertTriangle} value="3" label="At-Risk Groups" accent="amber" />
        <StatCard icon={Clock} value="2.3d" label="O− Days of Cover" accent="red" />
        <StatCard icon={Zap} value="94%" label="Model Accuracy" accent="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Weekly Demand Forecast" action={<Badge color="red">AI</Badge>}>
          <BarChart data={weekly} />
        </SectionCard>
        <SectionCard title="Monthly Trend & Projection" action={<Badge color="gray">* projected</Badge>}>
          <LineChart data={monthly} forecastFrom={6} />
          <p className="text-xs text-gray-400 mt-2">Hollow points indicate AI-projected months.</p>
        </SectionCard>
      </div>

      {/* Risk blood groups */}
      <SectionCard title="At-Risk Blood Groups" action={<Button variant="outline" icon={Bell}>Trigger Campaign</Button>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {risk.map(r => (
            <div key={r.group} className={`border-2 rounded-lg p-4 ${r.color === 'red' ? 'border-red-200 bg-red-50' : r.color === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <BloodTypeBadge group={r.group} size="sm" />
                <Badge color={r.color}>{r.level}</Badge>
              </div>
              <p className="text-sm font-medium text-gray-800">{r.forecast}</p>
              <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
            </div>
          ))}
        </div>
        {/* Shortage alerts */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-3 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> <span><strong>Shortage alert:</strong> O− will drop below safe threshold in ~2 days at current usage.</span>
          </div>
          <div className="flex items-center gap-3 bg-amber-50 text-amber-700 rounded-lg p-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" /> <span><strong>Watch:</strong> B− and AB− trending toward shortage by end of week.</span>
          </div>
        </div>
      </SectionCard>
    </DashboardLayout>
  );
};

/* ===================================================================================
   ADMIN PORTAL — Dashboard
   =================================================================================== */

const AdminDashboard = ({ nav }) => {
  const growth = [
    { label: 'Jan', value: 320 }, { label: 'Feb', value: 410 }, { label: 'Mar', value: 480 },
    { label: 'Apr', value: 520 }, { label: 'May', value: 640 }, { label: 'Jun', value: 712 },
  ];
  const donationsTrend = [
    { label: 'Jan', value: 980 }, { label: 'Feb', value: 1020 }, { label: 'Mar', value: 1120 },
    { label: 'Apr', value: 1080 }, { label: 'May', value: 1190 }, { label: 'Jun', value: 1240 },
  ];
  const entities = [
    { type: 'Donors', count: '5,012', icon: Users, accent: 'red' },
    { type: 'Hospitals', count: '52', icon: Hospital, accent: 'blue' },
    { type: 'Blood Banks', count: '14', icon: Building2, accent: 'green' },
    { type: 'Donations (YTD)', count: '6,630', icon: Droplet, accent: 'pink' },
  ];
  const recentUsers = [
    { name: 'Kandy Teaching Hospital', type: 'Hospital', status: 'Active', date: 'Jun 14' },
    { name: 'Tharindu Gamage', type: 'Donor', status: 'Active', date: 'Jun 14' },
    { name: 'Galle RBC', type: 'Blood Bank', status: 'Pending', date: 'Jun 13' },
    { name: 'Dilani Wickrama', type: 'Donor', status: 'Active', date: 'Jun 12' },
  ];

  return (
    <DashboardLayout {...nav} title="Admin Dashboard" subtitle="National system overview" userName="System Admin" role="Administrator">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {entities.map(e => <StatCard key={e.type} icon={e.icon} value={e.count} label={e.type} accent={e.accent} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="User Growth" action={<Badge color="green">+11% MoM</Badge>}>
          <LineChart data={growth} stroke="#dc2626" />
        </SectionCard>
        <SectionCard title="Donations Trend" action={<Badge color="gray">6 months</Badge>}>
          <BarChart data={donationsTrend} />
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Recent Registrations" className="lg:col-span-2" action={<Button variant="ghost" className="text-sm text-red-600">Manage users</Button>}>
          <Table columns={['Name', 'Type', 'Status', 'Joined']}>
            {recentUsers.map((u, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-4 py-3"><Badge color={u.type === 'Donor' ? 'red' : u.type === 'Hospital' ? 'blue' : 'green'}>{u.type}</Badge></td>
                <td className="px-4 py-3"><Badge color={u.status === 'Active' ? 'green' : 'yellow'}>{u.status}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.date}</td>
              </tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Reports">
          <div className="space-y-3">
            {['National Inventory Report', 'Donor Activity Report', 'Hospital Usage Report', 'AI Forecast Summary'].map((r, i) => (
              <button key={i} className="w-full flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50 text-sm">
                <span className="flex items-center gap-2 text-gray-700"><FileText className="w-4 h-4 text-red-600" /> {r}</span>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
          <div className="mt-4 bg-red-50 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <ShieldCheck className="w-5 h-5" /> All systems operational
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

/* ===================================================================================
   PUBLIC NAVBAR (existing)
   =================================================================================== */

const Navbar = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [
    { name: 'About Us', route: 'about' },
    { name: 'Services', route: 'services' },
    { name: 'Events & News', route: 'events' },
    { name: 'For Donors', route: 'donors' },
    { name: 'Contact Us', route: 'contact' },
  ];
  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <button onClick={() => onNavigate('home')} className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center"><Droplet className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">NBTS</span>
          </button>
          <div className="hidden md:flex space-x-8">
            {links.map(l => <button key={l.name} onClick={() => onNavigate(l.route)} className="text-gray-700 hover:text-red-600 font-medium">{l.name}</button>)}
          </div>
          <div className="hidden md:flex space-x-4">
            <button onClick={() => onNavigate('login')} className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">Login</button>
            <button onClick={() => onNavigate('register')} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Register</button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {links.map(l => <button key={l.name} onClick={() => onNavigate(l.route)} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">{l.name}</button>)}
            <div className="px-4 pt-2 flex gap-2">
              <button onClick={() => onNavigate('login')} className="flex-1 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50">Login</button>
              <button onClick={() => onNavigate('register')} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Register</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

/* ===================================================================================
   APP ROOT — routing + login-by-role
   =================================================================================== */

const App = () => {
  const [currentRoute, setCurrentRoute] = useState('home');

  const handleLogin = (role) => {
    const landing = {
      donor: 'donor-dashboard',
      hospital: 'hospital-dashboard',
      bloodbank: 'bank-dashboard',
      admin: 'admin-dashboard',
    }[role] || 'donor-dashboard';
    setCurrentRoute(landing);
  };
  const handleLogout = () => setCurrentRoute('home');

  // nav prop bundle shared by every dashboard screen
  const navFor = (portal, items) => ({
    portal, items, current: currentRoute, onNavigate: setCurrentRoute, onLogout: handleLogout,
  });

  const publicRoutes = {
    home: <Homepage onNavigate={setCurrentRoute} />,
    login: <LoginPage onLogin={handleLogin} onNavigate={setCurrentRoute} />,
    register: <RegisterPage onNavigate={setCurrentRoute} />,
    about: <AboutPage onNavigate={setCurrentRoute} />,
    services: <ServicesPage onNavigate={setCurrentRoute} />,
    events: <EventsNewsPage onNavigate={setCurrentRoute} />,
    donors: <ForDonorsPage onNavigate={setCurrentRoute} />,
    contact: <ContactUsPage onNavigate={setCurrentRoute} />,
  };

  const dashboardRoutes = {
    'donor-dashboard': <DonorDashboard nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-appointment': <AppointmentBooking nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-profile': <DonorProfile nav={navFor('Donor Portal', DONOR_NAV)} />,
    'hospital-dashboard': <HospitalDashboard nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-request': <BloodRequestPage nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'bank-dashboard': <BankDashboard nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'bank-inventory': <InventoryManagement nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'bank-donors': <DonorManagement nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'bank-prediction': <AIPrediction nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'admin-dashboard': <AdminDashboard nav={navFor('Admin Portal', ADMIN_NAV)} />,
  };

  const isPublic = !!publicRoutes[currentRoute];

  return (
    <>
      {isPublic && <Navbar onNavigate={setCurrentRoute} />}
      {publicRoutes[currentRoute] || dashboardRoutes[currentRoute] || publicRoutes.home}
    </>
  );
};

export default App;
