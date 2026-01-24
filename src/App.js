import React, { useState, useEffect } from 'react';
import { AlertCircle, Droplet, Hospital, Users, Calendar, Heart, Activity, MapPin, Phone, Mail, ChevronRight, Menu, X } from 'lucide-react';
import hero from "../src/assets/hero.jpg";

// Homepage Component
const Homepage = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const slides = [
    {
      title: "Welcome To Blood Donation System",
      subtitle: "National Blood Transfusion Service",
      location: "Sri Lanka",
      image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
    },
    {
      title: "Save Lives, Donate Blood",
      subtitle: "Every Drop Counts",
      location: "Join Our Mission",
      image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
    },
    {
      title: "Emergency Blood Requests",
      subtitle: "Real-Time Coordination",
      location: "Fast & Efficient",
      image: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { icon: Droplet, value: "10,000+", label: "Blood Donations", color: "text-red-600" },
    { icon: Users, value: "5,000+", label: "Active Donors", color: "text-blue-600" },
    { icon: Hospital, value: "50+", label: "Partner Hospitals", color: "text-green-600" },
    { icon: Heart, value: "15,000+", label: "Lives Saved", color: "text-pink-600" }
  ];

  const services = [
    {
      icon: Activity,
      title: "Blood Inventory Management",
      description: "Real-time tracking of blood availability across all regional centers"
    },
    {
      icon: AlertCircle,
      title: "Emergency Requests",
      description: "Priority handling for urgent blood requirements with instant notifications"
    },
    {
      icon: Calendar,
      title: "Donation Campaigns",
      description: "Organized blood donation drives with automated donor notifications"
    },
    {
      icon: MapPin,
      title: "Regional Coordination",
      description: "Efficient blood transfer between regions based on demand and availability"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Slider */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: slide.image }}
          >
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center">
              <div className="text-white max-w-2xl">
                <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl mb-2">{slide.subtitle}</p>
                <p className="text-lg mb-6">{slide.location}</p>
                <button className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 flex items-center">
                  PRAANA (SLSCDR)
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 text-center"
              >
                <stat.icon className={`w-12 h-12 mx-auto mb-3 ${stat.color}`} />
                <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive blood donation and transfusion management services for efficient healthcare delivery
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-lg border-2 border-gray-100 hover:border-red-300 hover:shadow-lg transition-all group"
              >
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

      {/* CTA Section */}
      <div className="bg-red-600 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Save Lives?
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            Join thousands of donors making a difference every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onNavigate('register')}
              className="px-8 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Become a Donor
            </button>
            <button className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all">
              Learn More
            </button>
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
              <p className="text-gray-400 text-sm">
                National Blood Transfusion Service - Sri Lanka
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="hover:text-white cursor-pointer">About Us</div>
                <div className="hover:text-white cursor-pointer">Services</div>
                <div className="hover:text-white cursor-pointer">Donate Blood</div>
                <div className="hover:text-white cursor-pointer">Find Blood</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  +94 11 269 5671
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  info@nbts.health.gov.lk
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Colombo, Sri Lanka
                </div>
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

// Login Page
const LoginPage = ({ onLogin, onNavigate }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '', role: 'hospital' });

  const handleSubmit = () => {
    onLogin(credentials.role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Droplet className="text-red-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 text-sm mt-1">Login to access your account</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login As</label>
            <select
              value={credentials.role}
              onChange={(e) => setCredentials({...credentials, role: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="hospital">Hospital</option>
              <option value="bloodbank">Blood Bank</option>
              <option value="donor">Donor</option>
            </select>
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Login
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <button onClick={() => onNavigate('home')} className="text-sm text-gray-600 hover:text-red-600">
            ← Back to Home
          </button>
        </div>
        
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account? <button onClick={() => onNavigate('register')} className="text-red-600 hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
};

// Hospital Dashboard (simplified for space)
const HospitalDashboard = ({ onNavigate, onLogout }) => {
  const [requests] = useState([
    { id: 1, type: 'Emergency', bloodGroup: 'O+', units: 3, status: 'Pending', date: '2026-01-23' },
    { id: 2, type: 'Normal', bloodGroup: 'A+', units: 2, status: 'Approved', date: '2026-01-22' }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-red-600 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Hospital className="w-6 h-6 mr-2" />
            <span className="text-xl font-bold">Hospital Portal</span>
          </div>
          <button onClick={onLogout} className="px-4 py-2 bg-red-700 rounded hover:bg-red-800">
            Logout
          </button>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-gray-800">1</p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Approved</p>
                <p className="text-3xl font-bold text-gray-800">1</p>
              </div>
              <Droplet className="w-12 h-12 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Emergency</p>
                <p className="text-3xl font-bold text-gray-800">1</p>
              </div>
              <Hospital className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Blood Requests</h2>
            <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              + New Request
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Blood Group</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Units</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">#{req.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        req.type === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{req.bloodGroup}</td>
                    <td className="px-4 py-3">{req.units}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Droplet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">NBTS</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <button className="text-gray-700 hover:text-red-600 font-medium">
              About Us
            </button>
            <button className="text-gray-700 hover:text-red-600 font-medium">
              Services
            </button>
            <button className="text-gray-700 hover:text-red-600 font-medium">
              Events & News
            </button>
            <button className="text-gray-700 hover:text-red-600 font-medium">
              For Donors
            </button>
            <button className="text-gray-700 hover:text-red-600 font-medium">
              Contact Us
            </button>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex space-x-4">
            <button
              onClick={() => onNavigate('login')}
              className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Register
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
              About Us
            </button>
            <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
              Services
            </button>
            <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
              Events & News
            </button>
            <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
              For Donors
            </button>
            <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
              Contact Us
            </button>

            <div className="px-4 pt-2 space-y-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 bg-red-600 text-white rounded-xl"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Main App
const App = () => {
  const [currentRoute, setCurrentRoute] = useState('home');
  const [userRole, setUserRole] = useState(null);

  const handleLogin = (role) => {
    setUserRole(role);
    setCurrentRoute('hospital-dashboard');
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentRoute('home');
  };

  const routes = {
    home: <Homepage onNavigate={setCurrentRoute} />,
    login: <LoginPage onLogin={handleLogin} onNavigate={setCurrentRoute} />,
    'hospital-dashboard': (
      <HospitalDashboard onNavigate={setCurrentRoute} onLogout={handleLogout} />
    ),
  };

  return (
    <>
      {/* Show Navbar only on public pages */}
      {(currentRoute === 'home' || currentRoute === 'login' || currentRoute == 'register') && (
        <Navbar onNavigate={setCurrentRoute} />
      )}

      {routes[currentRoute] || routes.home}
    </>
  );
};

export default App;