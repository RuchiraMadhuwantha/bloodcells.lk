import React, { useCallback, useEffect, useState } from 'react';
import {
  Menu, X, Droplet, Calendar, User, Database, Users,
  LayoutDashboard, ShieldCheck, Megaphone, Building2, ClipboardList, History, Bell, Siren
} from 'lucide-react';
import AboutPage from './AboutPage';
import ServicesPage from './ServicesPage';
import EventsNewsPage from './EventsNewsPage';
import ForDonorsPage from './ForDonorsPage';
import ContactUsPage from './ContactUsPage';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
import Home from './Home';

// Import dashboard components
import { DonorDashboard, AppointmentBooking, DonorProfile } from './Donors';
import { DonationHistory, MyAppointments } from './components/donor/DonorRecords';
import { DonorCampaigns } from './components/donor/DonorCampaigns';
import { DonorNotifications } from './components/donor/DonorNotifications';
import { EmergencyAlerts } from './components/donor/EmergencyAlerts';
import { HospitalDashboard, BloodRequestPage } from './Hospital';
import { HospitalPortal } from './components/hospital/HospitalUI';
import { HospitalAppointments } from './components/hospital/HospitalAppointments';
import { HospitalCampaigns, HospitalNotifications } from './components/hospital/HospitalCampaigns';
import { MyBloodRequests } from './components/hospital/HospitalRequests';
import { HospitalInventory } from './components/hospital/HospitalStock';
import { HospitalUsage } from './components/hospital/HospitalUsage';
import { HospitalTransfers } from './components/hospital/HospitalTransfers';
import { HospitalReports } from './components/hospital/HospitalReports';
import { HospitalProfile } from './components/hospital/HospitalProfile';
import { BankDashboard, InventoryManagement, DonorManagement, BloodRequestQueue } from './BloodBank';
import { BankSelectionProvider } from './components/bank/BankUI';
import { BankAppointments } from './components/bank/BankOperations';
import { BloodExpiry, BloodTransfers } from './components/bank/BankRegional';
import { BankNotifications } from './components/bank/BankNotifications';
import { BankReports } from './components/bank/BankReports.js';
import { CampaignManagement } from './components/CampaignManagement';
import { HospitalManagement } from './components/HospitalManagement';
import { HospitalProvider, useHospitals } from './data/hospitals';
import { AdminDashboard } from './AdminDashboard';
import { AuthProvider, useAuth, canAccess } from './context/AuthContext';

/* ===================================================================================
   PUBLIC PAGES — Homepage + Login + Register
   =================================================================================== */

// Sidebar navigation items for each portal
const DONOR_NAV = [
  { route: 'donor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'donor-appointment', label: 'Book Appointment', icon: Calendar },
  { route: 'donor-profile', label: 'My Profile', icon: User },
  { route: 'donor-appointments', label: 'My Appointments', icon: ClipboardList },
  { route: 'donor-history', label: 'Donation History', icon: History },
  { route: 'donor-campaigns', label: 'Blood Donation Campaigns', icon: Megaphone },
  { route: 'donor-my-campaigns', label: 'My Campaigns', icon: Calendar },
  { route: 'donor-notifications', label: 'Notifications', icon: Bell },
  { route: 'donor-emergency-alerts', label: 'Emergency Donation Alerts', icon: Siren },
];

const HOSPITAL_NAV = [
  { route: 'hospital-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'hospital-appointments', label: 'Appointment Management', icon: Calendar },
  { route: 'hospital-campaigns', label: 'Blood Donation Campaigns', icon: Megaphone },
  { route: 'hospital-request', label: 'New Blood Request', icon: Calendar },
  { route: 'hospital-requests', label: 'My Blood Requests', icon: ClipboardList },
  { route: 'hospital-inventory', label: 'Hospital Inventory', icon: Database },
  { route: 'hospital-transfers', label: 'Blood Transfers', icon: ClipboardList },
  { route: 'hospital-usage', label: 'Blood Usage', icon: History },
  { route: 'hospital-reports', label: 'Reports', icon: ClipboardList },
  { route: 'hospital-profile', label: 'Hospital Profile', icon: Building2 },
];

const BANK_NAV = [
  { route: 'bank-dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { route: 'bank-hospitals', label: 'Hospital Management', icon: Building2, group: 'Operations' },
  { route: 'bank-inventory', label: 'Blood Inventory', icon: Database, group: 'Operations' },
  { route: 'bank-expiry', label: 'Blood Expiry', icon: Calendar, group: 'Operations' },
  { route: 'bank-requests', label: 'Blood Requests', icon: ClipboardList, group: 'Operations' },
  { route: 'bank-donors', label: 'Donor Management', icon: Users, group: 'Donors and collections' },
  { route: 'bank-appointments', label: 'Appointment Management', icon: Calendar, group: 'Donors and collections' },
  { route: 'bank-campaigns', label: 'Campaign Management', icon: Megaphone, group: 'Donors and collections' },
  { route: 'bank-notifications', label: 'Notification Management', icon: Bell, group: 'Donors and collections' },
  { route: 'bank-transfers', label: 'Blood Transfers', icon: ClipboardList, group: 'Stock and transfers' },
  { route: 'bank-reports', label: 'Reports', icon: ClipboardList, group: 'Reports and tools' },
  { route: 'admin-dashboard', label: 'Administrator', icon: ShieldCheck, group: 'Reports and tools' },
];

// Preserve the Administrator screen's existing menu, labels and routes.
const ADMIN_NAV = ['bank-dashboard', 'bank-inventory', 'bank-requests', 'bank-donors', 'bank-campaigns', 'bank-hospitals', 'admin-dashboard']
  .map((route) => {
    const { group, ...item } = BANK_NAV.find((entry) => entry.route === route);
    return { ...item, label: ({ 'bank-inventory': 'Inventory', 'bank-donors': 'Donors', 'bank-campaigns': 'Campaigns' })[route] || item.label };
  });



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
  <AuthProvider>
    <HospitalProvider>
      <AppInner />
    </HospitalProvider>
  </AuthProvider>
);

const normalizePortalRoute=route=>({'bank-shortages':'bank-inventory','bank-regional-stock':'bank-inventory','bank-eligible':'bank-donors'}[route]||route);
const AppInner = () => {
  const { pendingCount, loading: hospitalCountLoading, error: hospitalCountError } = useHospitals();
  const { role, isAuthenticated, booting, signOut, verificationError, retrySession } = useAuth();
  // The backend sends reset links as `#/reset-password?token=…`, so honour that
  // on first paint instead of always landing on the homepage.
  const [currentRoute, updateCurrentRoute] = useState(() =>
    (typeof window !== 'undefined' && window.location.hash.startsWith('#reset-password')
      ? 'reset-password'
      : normalizePortalRoute(window.sessionStorage.getItem('currentRoute') || 'home'))
  );
  const setCurrentRoute = useCallback((route) => {
    route=normalizePortalRoute(route);
    if (window.history.state?.appRoute !== route) {
      window.history.pushState({ ...window.history.state, appRoute: route }, '');
    }
    updateCurrentRoute(route);
  }, []);
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, appRoute: currentRoute }, '');
    const onBack = (event) => updateCurrentRoute(normalizePortalRoute(event.state?.appRoute || 'home'));
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
    // Register once; subsequent navigation writes its own history entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { window.sessionStorage.setItem('currentRoute', currentRoute); }, [currentRoute]);

  // Sidebar nav with live pending-approval badge on Hospital Management
  const bankNav = BANK_NAV.map((i) =>
    i.route === 'bank-hospitals' ? { ...i, badge: hospitalCountLoading || hospitalCountError ? null : pendingCount } : i
  );

  const handleLogout = () => {
    signOut();
    setCurrentRoute('home');
  };

  // nav prop bundle shared by every dashboard screen
  const navFor = (portal, items) => ({
    portal, items, current: currentRoute, onNavigate: setCurrentRoute, onLogout: handleLogout,
  });

  const publicRoutes = {
    home: <Home onNavigate={setCurrentRoute} />,
    login: <LoginPage onNavigate={setCurrentRoute} />,
    'forgot-password': <ForgotPassword onNavigate={setCurrentRoute} />,
    'reset-password': <ResetPassword onNavigate={setCurrentRoute} />,
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
    'donor-appointments': <MyAppointments nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-history': <DonationHistory nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-campaigns': <DonorCampaigns key="browse" nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-my-campaigns': <DonorCampaigns key="mine" mine nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-notifications': <DonorNotifications nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-emergency-alerts': <EmergencyAlerts nav={navFor('Donor Portal', DONOR_NAV)} />,
    'donor-profile': <DonorProfile nav={navFor('Donor Portal', DONOR_NAV)} />,
    'hospital-dashboard': <HospitalDashboard nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-appointments': <HospitalAppointments nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-campaigns': <HospitalCampaigns nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-notifications': <HospitalNotifications nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-request': <BloodRequestPage nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-requests': <MyBloodRequests nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-availability': <HospitalInventory nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-inventory': <HospitalInventory nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-transfers': <HospitalTransfers nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-usage': <HospitalUsage nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-reports': <HospitalReports nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'hospital-profile': <HospitalProfile nav={navFor('Hospital Portal', HOSPITAL_NAV)} />,
    'bank-dashboard': <BankDashboard nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-expiry': <BloodExpiry nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-appointments': <BankAppointments nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-notifications': <BankNotifications nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-transfers': <BloodTransfers nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-reports': <BankReports nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-inventory': <InventoryManagement key="inventory" nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-donors': <DonorManagement key="directory" nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-requests': <BloodRequestQueue nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-campaigns': <CampaignManagement nav={navFor('Blood Bank Portal', bankNav)} />,
    'bank-hospitals': <HospitalManagement nav={navFor('Blood Bank Portal', bankNav)} />,
    'admin-dashboard': <AdminDashboard nav={navFor('Blood Bank Portal', ADMIN_NAV.map(i => i.route === 'bank-hospitals' ? { ...i, badge: hospitalCountLoading || hospitalCountError ? null : pendingCount } : i))} />,
  };

  const isPublic = !!publicRoutes[currentRoute];

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500 text-sm">Loading your portal…</p>
      </div>
    );
  }

  // Any dashboard route requires a session; the role must also match the portal.
  if (verificationError) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"><p role="alert">{verificationError}</p><button onClick={retrySession} className="text-red-600 underline">Retry session</button><button onClick={handleLogout}>Log out</button></div>;
  }
  const wantsDashboard = !!dashboardRoutes[currentRoute];
  if (wantsDashboard && (!isAuthenticated || !canAccess(role, currentRoute))) {
    return publicRoutes.login;
  }

  return (
    <>
      {isPublic && <Navbar onNavigate={setCurrentRoute} activePage={currentRoute} />}
      {isPublic
        ? publicRoutes[currentRoute]
        : currentRoute.startsWith('hospital-') && dashboardRoutes[currentRoute]
          ? <HospitalPortal nav={navFor('Hospital Portal', HOSPITAL_NAV)}>{dashboardRoutes[currentRoute]}</HospitalPortal>
          : currentRoute.startsWith('bank-') && dashboardRoutes[currentRoute]
            ? <BankSelectionProvider>{dashboardRoutes[currentRoute]}</BankSelectionProvider>
            : dashboardRoutes[currentRoute] || publicRoutes.home}
    </>
  );
};

export default App;
