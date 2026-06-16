import React from 'react';
import { Activity, AlertCircle, Calendar, MapPin, Database, Users, Sparkles, ChevronRight, Check } from 'lucide-react';

const ServicesPage = ({ onNavigate }) => {
  const mainServices = [
    {
      icon: Activity,
      title: "Blood Inventory Management",
      description: "Real-time tracking and management of blood availability across all regional centers",
      features: ["Live stock updates", "Blood type distribution", "Expiry alerts", "Regional transfers"]
    },
    {
      icon: AlertCircle,
      title: "Emergency Blood Requests",
      description: "Priority handling for urgent blood requirements with instant notifications",
      features: ["24/7 availability", "Instant notification", "Fast processing", "Priority dispatch"]
    },
    {
      icon: Calendar,
      title: "Donation Campaigns",
      description: "Organized blood donation drives with automated donor notifications",
      features: ["Campaign scheduling", "Donor notifications", "Registration tracking", "Performance reports"]
    },
    {
      icon: MapPin,
      title: "Regional Coordination",
      description: "Efficient blood transfer between regions based on demand and availability",
      features: ["Smart routing", "Logistics tracking", "Cross-region transfers", "Optimization"]
    },
    {
      icon: Database,
      title: "Donor Database Management",
      description: "Comprehensive donor profiles with eligibility tracking and donation history",
      features: ["Eligibility tracking", "Donation history", "Health screening", "Follow-up alerts"]
    },
    {
      icon: Sparkles,
      title: "AI Demand Prediction",
      description: "Machine learning-powered forecasting to anticipate blood demand patterns",
      features: ["Predictive analytics", "Trend analysis", "Resource planning", "Optimization"]
    },
  ];

  const services = [
    {
      category: "For Donors",
      items: [
        "Donor registration and profile management",
        "Appointment booking at nearby centers",
        "Eligibility assessment",
        "Donation history tracking",
        "Impact visualization (lives saved)",
        "Donation reminders and notifications"
      ]
    },
    {
      category: "For Hospitals",
      items: [
        "Emergency blood request system",
        "Real-time inventory search",
        "Priority request handling",
        "Blood delivery coordination",
        "Usage tracking and reporting",
        "Cross-hospital coordination"
      ]
    },
    {
      category: "For Blood Banks",
      items: [
        "Inventory management system",
        "Donor recruitment tools",
        "Campaign organization",
        "Regional blood transfers",
        "Quality assurance tracking",
        "Analytics and reporting"
      ]
    },
    {
      category: "For Administrators",
      items: [
        "System-wide oversight",
        "Performance analytics",
        "Policy management",
        "User administration",
        "Report generation",
        "Network coordination"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-lg text-red-100">Comprehensive blood donation and transfusion management solutions</p>
        </div>
      </section>

      {/* Main Services Grid */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Core Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {mainServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="bg-white border-2 border-gray-100 rounded-lg p-8 hover:border-red-300 hover:shadow-lg transition-all">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Portal-Specific Services */}
      <section className="bg-gray-50 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Services by Portal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((serviceGroup, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{serviceGroup.category}</h3>
                <ul className="space-y-3">
                  {serviceGroup.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose PRAANA */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Choose PRAANA?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Fast & Reliable</h3>
                  <p className="text-gray-600">Emergency blood requests reach banks in seconds, not hours</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">AI-Powered</h3>
                  <p className="text-gray-600">Predictive analytics prevent shortages before they happen</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Transparent</h3>
                  <p className="text-gray-600">Track the impact of every donation from collection to transfusion</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Secure</h3>
                  <p className="text-gray-600">All donor and patient data protected with medical-grade security</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Accessible</h3>
                  <p className="text-gray-600">Available 24/7 from any device with an internet connection</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Scalable</h3>
                  <p className="text-gray-600">Designed to handle growth across all regions of Sri Lanka</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-red-100 mb-8">Choose your role and access the portal that's right for you</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => onNavigate('register')} className="px-8 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-all">
              Become a Donor
            </button>
            <button onClick={() => onNavigate('login')} className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all">
              Login to Portal
            </button>
          </div>
        </div>
      </section>

      {/* Back Button */}
      <section className="py-8 px-4 text-center">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          ← Back to Home
        </button>
      </section>
    </div>
  );
};

export default ServicesPage;
