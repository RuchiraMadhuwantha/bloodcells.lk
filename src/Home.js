import React, { useState, useEffect } from 'react';
import { Droplet, Users, Calendar } from 'lucide-react';
import heroImage from './assets/hero.jpg';

const Homepage = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { title: 'Welcome To Blood Donation System', subtitle: 'National Blood Transfusion Service', location: 'Sri Lanka', image: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' },
    { title: 'Save Lives, Donate Blood', subtitle: 'Every Drop Counts', location: 'Join Our Mission', image: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' },
    { title: 'Emergency Blood Requests', subtitle: 'Real-Time Coordination', location: 'Fast & Efficient', image: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)' },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const stats = [
    { icon: Droplet, value: '10,000+', label: 'Blood Donations', color: 'text-red-600' },
    { icon: Users, value: '5,000+', label: 'Active Donors', color: 'text-blue-600' },
    { icon: null, value: '50+', label: 'Partner Hospitals', color: 'text-green-600' },
    { icon: null, value: '15,000+', label: 'Lives Saved', color: 'text-pink-600' },
  ];

  return (
    <div className="min-h-screen page-shell">
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
                <button onClick={() => onNavigate('register')} className="bg-white text-red-700 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" /> Book Appointment
                </button>
                <button onClick={() => onNavigate('register')} className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all">
                  Become a Donor
                </button>
                <button onClick={() => onNavigate('login')} className="border border-white/60 text-white/95 px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-700 transition-all">
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

export default Homepage;
