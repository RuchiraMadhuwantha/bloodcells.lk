import React, { useState } from 'react';
import { Menu, X, Droplet, ChevronRight, Heart, Award } from 'lucide-react';
import AboutPage from './AboutPage';
import ServicesPage from './ServicesPage';
import heroImage from './assets/hero.jpg';
import EventsNewsPage from './EventsNewsPage';
import ForDonorsPage from './ForDonorsPage';
import ContactUsPage from './ContactUsPage';

// Import dashboard components
import { DonorDashboard, AppointmentBooking, DonorProfile } from './Donors';
import { HospitalDashboard, BloodRequestPage } from './Hospital';
import { BankDashboard, InventoryManagement, DonorManagement, AIPrediction } from './BloodBank';
import { AdminDashboard } from './AdminDashboard';

// Import navigation items
import { LayoutDashboard, Calendar, User, Database, Users, Sparkles } from 'lucide-react';

/* ===================================================================================
   PUBLIC PAGES — Homepage + Login + Register
   =================================================================================== */

// Sidebar navigation items for each portal
const DONOR_NAV = [
  { route: 'donor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'donor-appointment', label: 'Book Appointment', icon: Calendar },
  { route: 'donor-profile', label: 'My Profile', icon: User },
];

const HOSPITAL_NAV = [
  { route: 'hospital-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'hospital-request', label: 'New Blood Request', icon: Calendar },
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

const Homepage = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { title: "Welcome To Blood Donation System", subtitle: "National Blood Transfusion Service", location: "Sri Lanka", image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" },
    { title: "Save Lives, Donate Blood", subtitle: "Every Drop Counts", location: "Join Our Mission", image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" },
    { title: "Emergency Blood Requests", subtitle: "Real-Time Coordination", location: "Fast & Efficient", image: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)" },
  ];

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const stats = [
    { icon: Droplet, value: "10,000+", label: "Blood Donations", color: "text-red-600" },
    { icon: Users, value: "5,000+", label: "Active Donors", color: "text-blue-600" },
    { icon: null, value: "50+", label: "Partner Hospitals", color: "text-green-600" },
    { icon: null, value: "15,000+", label: "Lives Saved", color: "text-pink-600" },
  ];

  return (
    <div className="min-h-screen page-shell">
      {/* Hero Section */}
      <div className="relative h-auto overflow-hidden bg-red-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-red-800/90 px-4 py-2 rounded-full text-sm uppercase tracking-[0.2em] font-semibold">
                <Droplet className="w-4 h-4" /> Emergency Blood Support
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">Welcome to Blood Donation System</h1>
                <p className="mt-4 text-lg text-red-100 max-w-2xl">A national platform for donors, hospitals, and blood banks to coordinate safe and timely blood supply across Sri Lanka.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => onNavigate('register')} className="bg-white text-red-700 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-all">
                  Become a Donor <ChevronRight className="w-5 h-5 ml-2" />
                </button>
                <button onClick={() => onNavigate('login')} className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-700 transition-all">
                  Request Blood
                </button>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Blood Donation',
                  description: 'Support patients in need with safe blood units.',
                  image: heroImage,
                },
                {
                  title: 'Emergency Requests',
                  description: 'Immediate response for urgent transfusion needs.',
                  image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
                },
                {
                  title: 'Community Care',
                  description: 'Connecting donors, hospitals and blood banks.',
                  image: 'https://images.unsplash.com/photo-1542736667-069246bdbc60?auto=format&fit=crop&w=800&q=80',
                },
              ].map((item, index) => (
                <div key={index} className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-xl">
                  <img src={item.image} alt={item.title} className="h-40 w-full object-cover brightness-90" loading="lazy" />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-red-100">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="bg-white p-8 rounded-3xl shadow-md border border-red-50">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Blood Donation Matters</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Every donation supports emergency surgeries, cancer treatment, and accident care across Sri Lanka. With every unit donated, we help save lives and keep our hospitals ready for the unexpected.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-red-50">
                  <p className="text-2xl font-bold text-red-600">1 in 4</p>
                  <p className="text-sm text-gray-600">patients need blood transfusion</p>
                </div>
                <div className="p-5 rounded-2xl bg-red-50">
                  <p className="text-2xl font-bold text-red-600">Every 2 secs</p>
                  <p className="text-sm text-gray-600">someone in Sri Lanka needs blood</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-md border border-red-50">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Progress</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Total Donations</span>
                  <span className="text-red-600 font-semibold">10,000+</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden"><div className="h-full w-[85%] bg-red-600"></div></div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Active Donors</span>
                  <span className="text-red-600 font-semibold">5,000+</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden"><div className="h-full w-[70%] bg-red-600"></div></div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Partner Hospitals</span>
                  <span className="text-red-600 font-semibold">50+</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden"><div className="h-full w-[60%] bg-red-600"></div></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 text-center">
                {stat.icon && <stat.icon className={`w-12 h-12 mx-auto mb-3 ${stat.color}`} />}
                <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
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
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div>+94 11 269 5671</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Locations</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Sri Lanka</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const LoginPage = ({ onLogin, onNavigate }) => {
  const [credentials, setCredentials] = React.useState({ email: '', password: '', role: 'donor' });
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
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account? <button onClick={() => onNavigate('register')} className="text-red-600 hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = ({ onNavigate }) => {
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', group: 'O+', password: '' });
  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Become a Donor</h1>
        </div>
        <div className="space-y-4">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Your name" />
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="your@email.com" />
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••••" />
          <button onClick={() => onNavigate('login')} className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">Create Account</button>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <nav className="bg-white/95 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <button onClick={() => onNavigate('home')} className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center"><Droplet className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">NBTS</span>
          </button>
          <div className="hidden md:flex space-x-8">
            <button onClick={() => onNavigate('about')} className="text-gray-700 hover:text-red-600 font-medium">About Us</button>
            <button onClick={() => onNavigate('services')} className="text-gray-700 hover:text-red-600 font-medium">Services</button>
            <button onClick={() => onNavigate('events')} className="text-gray-700 hover:text-red-600 font-medium">Events</button>
            <button onClick={() => onNavigate('donors')} className="text-gray-700 hover:text-red-600 font-medium">For Donors</button>
            <button onClick={() => onNavigate('contact')} className="text-gray-700 hover:text-red-600 font-medium">Contact</button>
          </div>
          <div className="hidden md:flex space-x-4">
            <button onClick={() => onNavigate('login')} className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">Login</button>
            <button onClick={() => onNavigate('register')} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Register</button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
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
