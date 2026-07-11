import React, { useState } from 'react';
import {
  Menu, X, Droplet, ChevronRight, Heart, Award, Calendar, User, Database, Users, Sparkles,
  Lock, Phone, Mail, FileText, Activity, Check, AlertCircle, MapPin, LayoutDashboard, ShieldCheck
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
  { route: 'bank-prediction', label: 'AI Demand Prediction', icon: Sparkles },
  { route: 'admin-dashboard', label: 'Administrator', icon: ShieldCheck },
];

const ADMIN_NAV = [
  { route: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'bank-prediction', label: 'AI Demand Prediction', icon: Sparkles },
];



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
            <button onClick={() => onNavigate('contact')} className="text-gray-700 hover:text-red-600 font-medium">Contact</button>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            
            <button onClick={() => onNavigate('register')} className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">Register</button>
            <button onClick={() => onNavigate('login')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-1.5 shadow-sm shadow-red-100">
              <Calendar className="w-4 h-4" /> Login
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}</button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 shadow-inner">
          <button onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-700 hover:text-red-600 font-medium py-1">About Us</button>
          <button onClick={() => { onNavigate('services'); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-700 hover:text-red-600 font-medium py-1">Services</button>
          <button onClick={() => { onNavigate('events'); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-700 hover:text-red-600 font-medium py-1">Events</button>
          <button onClick={() => { onNavigate('donors'); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-700 hover:text-red-600 font-medium py-1">For Donors</button>
          <button onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-700 hover:text-red-600 font-medium py-1">Contact</button>
          <hr className="border-gray-100" />
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }} className="w-full py-2 text-center text-red-600 border border-red-600 rounded-lg hover:bg-red-50 font-medium">Login</button>
            <button onClick={() => { onNavigate('register'); setMobileMenuOpen(false); }} className="w-full py-2 text-center bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-1.5 shadow-sm">
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

const App = () => {
  const [currentRoute, setCurrentRoute] = useState('home');

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
    'bank-dashboard': <BankDashboard nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'bank-inventory': <InventoryManagement nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'bank-donors': <DonorManagement nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'bank-prediction': <AIPrediction nav={navFor('Blood Bank Portal', BANK_NAV)} />,
    'admin-dashboard': <AdminDashboard nav={navFor('Blood Bank Portal', BANK_NAV)} />,
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
