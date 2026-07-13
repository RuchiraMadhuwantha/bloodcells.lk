import React, { useState } from 'react';
import {
  Menu, X, Droplet, ChevronRight, Heart, Award, Calendar, User, Database, Users, Sparkles,
  Lock, Phone, Mail, FileText, Activity, Check, AlertCircle, MapPin, LayoutDashboard, ShieldCheck, Megaphone, Building2
} from 'lucide-react';
import AboutPage from './AboutPage';
import ServicesPage from './ServicesPage';
import EventsNewsPage from './EventsNewsPage';
import ForDonorsPage from './ForDonorsPage';
import ContactUsPage from './ContactUsPage';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import Home from './Home';

// Import dashboard components
import { DonorDashboard, AppointmentBooking, DonorProfile } from './Donors';
import { HospitalDashboard, BloodRequestPage } from './Hospital';
import { BankDashboard, InventoryManagement, DonorManagement, AIPrediction } from './BloodBank';
import { CampaignManagement } from './components/CampaignManagement';
import { HospitalManagement } from './components/HospitalManagement';
import { HospitalProvider, useHospitals } from './data/hospitals';
import { AdminDashboard } from './AdminDashboard';

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
  { route: 'bank-campaigns', label: 'Campaigns', icon: Megaphone },
  { route: 'bank-hospitals', label: 'Hospital Management', icon: Building2 },
  { route: 'admin-dashboard', label: 'Administrator', icon: ShieldCheck },
];

const ADMIN_NAV = [
  { route: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'bank-prediction', label: 'AI Demand Prediction', icon: Sparkles },
];



const Navbar = ({ onNavigate, activePage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { route: 'home',     label: 'Home'     },
    { route: 'about',    label: 'About Us'  },
    { route: 'services', label: 'Services'  },
    { route: 'events',   label: 'Events'   },
    { route: 'contact',  label: 'Contact'  },
  ];

  const linkClass = (route) =>
    activePage === route
      ? 'relative font-semibold text-red-600 after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-red-600 after:rounded-full'
      : 'font-medium text-gray-600 hover:text-red-600 transition-colors';

  const mobileLinkClass = (route) =>
    activePage === route
      ? 'flex items-center gap-2 w-full text-left text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-lg'
      : 'flex items-center gap-2 w-full text-left text-gray-700 hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors';

  return (
    <nav className="bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <button onClick={() => onNavigate('home')} className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
              <Droplet className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800 tracking-tight">BloodCells<span className="text-red-600">.lk</span></span>
          </button>
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ route, label }) => (
              <button
                key={route}
                onClick={() => onNavigate(route)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${linkClass(route)}`}
              >
                {label}
                {activePage === route && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-red-500 rounded-full align-middle" />
                )}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <button onClick={() => onNavigate('register')} className="px-4 py-2 text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors font-semibold text-sm">Register</button>
            <button onClick={() => onNavigate('login')} className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full hover:from-red-700 hover:to-red-800 transition-all font-semibold text-sm flex items-center gap-1.5 shadow-md shadow-red-200">
              <Calendar className="w-4 h-4" /> Login
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}</button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg">
          {navLinks.map(({ route, label }) => (
            <button
              key={route}
              onClick={() => { onNavigate(route); setMobileMenuOpen(false); }}
              className={mobileLinkClass(route)}
            >
              {activePage === route && <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />}
              {label}
            </button>
          ))}
          <button onClick={() => { onNavigate('donors'); setMobileMenuOpen(false); }} className={mobileLinkClass('donors')}>For Donors</button>
          <hr className="border-gray-100 my-2" />
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }} className="w-full py-2 text-center text-red-600 border border-red-200 rounded-full hover:bg-red-50 font-semibold">Login</button>
            <button onClick={() => { onNavigate('register'); setMobileMenuOpen(false); }} className="w-full py-2 text-center bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full hover:from-red-700 hover:to-red-800 font-semibold flex items-center justify-center gap-1.5 shadow-md">
              <Calendar className="w-4 h-4" /> Book Appointment
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

/* ===================================================================================
   APP ROOT — routing + login-by-role
   =================================================================================== */

const App = () => (
  <HospitalProvider>
    <AppInner />
  </HospitalProvider>
);

const AppInner = () => {
  const { pendingCount } = useHospitals();
  const [currentRoute, setCurrentRoute] = useState('home');

  // Sidebar nav with live pending-approval badge on Hospital Management
  const bankNav = BANK_NAV.map((i) =>
    i.route === 'bank-hospitals' ? { ...i, badge: pendingCount } : i
  );

  const handleLogin = (role, token, user) => {
    localStorage.setItem('authToken', token || '');
    localStorage.setItem('authUser', JSON.stringify(user || {}));

    const landing = {
      donor: 'donor-dashboard',
      hospital: 'hospital-dashboard',
      blood_bank: 'bank-dashboard',
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
    home: <Home onNavigate={setCurrentRoute} />,
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
    'bank-dashboard': <BankDashboard nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-inventory': <InventoryManagement nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-donors': <DonorManagement nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-campaigns': <CampaignManagement nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-hospitals': <HospitalManagement nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-prediction': <AIPrediction nav={navFor('Blood Bank Portal', bankNav)} />,
    'admin-dashboard': <AdminDashboard nav={navFor('Blood Bank Portal', bankNav)} />,
  };

  const isPublic = !!publicRoutes[currentRoute];

  return (
    <>
      {isPublic && <Navbar onNavigate={setCurrentRoute} activePage={currentRoute} />}
      {publicRoutes[currentRoute] || dashboardRoutes[currentRoute] || publicRoutes.home}
    </>
  );
};

export default App;
