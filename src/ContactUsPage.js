import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageSquare, Send, MapIcon } from 'lucide-react';

const ContactUsPage = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  const locations = [
    {
      name: "NBTS Head Office",
      address: "National Blood Transfusion Service",
      city: "Colombo, Sri Lanka",
      phone: "+94 11 2 699 191",
      hours: "Mon - Fri: 8:00 AM - 5:00 PM",
      type: "Main Office"
    },
    {
      name: "Colombo Regional Center",
      address: "Central Blood Bank",
      city: "Colombo, Sri Lanka",
      phone: "+94 11 2 692 661",
      hours: "Mon - Sat: 7:00 AM - 8:00 PM",
      type: "Regional Center"
    },
    {
      name: "Kurunegala District Center",
      address: "District Blood Bank",
      city: "Kurunegala, Sri Lanka",
      phone: "+94 37 2 223 445",
      hours: "Mon - Fri: 8:00 AM - 5:00 PM",
      type: "District Center"
    },
    {
      name: "Anuradhapura District Center",
      address: "District Blood Bank",
      city: "Anuradhapura, Sri Lanka",
      phone: "+94 25 2 222 333",
      hours: "Mon - Fri: 8:00 AM - 5:00 PM",
      type: "District Center"
    }
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: "Phone",
      description: "Call us for urgent queries",
      detail: "+94 11 2 699 191",
      subDetail: "24/7 Emergency Line: +94 11 2 692 661"
    },
    {
      icon: Mail,
      title: "Email",
      description: "Send us an email anytime",
      detail: "info@nbts.lk",
      subDetail: "Emergency: emergency@nbts.lk"
    },
    {
      icon: MessageSquare,
      title: "Chat Support",
      description: "Get instant help from PRAANA Assistant",
      detail: "Click the chat icon in the app",
      subDetail: "Available 24/7, AI-powered responses"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      description: "Come to our main office",
      detail: "Colombo Regional Center",
      subDetail: "Open 7:00 AM - 8:00 PM, 7 days a week"
    }
  ];

  const departments = [
    {
      name: "General Inquiries",
      email: "info@nbts.lk",
      phone: "+94 11 2 699 191",
      topics: ["Registration help", "General questions", "Feedback"]
    },
    {
      name: "Donor Support",
      email: "donors@nbts.lk",
      phone: "+94 11 2 699 192",
      topics: ["Donation eligibility", "Appointment booking", "Donor concerns"]
    },
    {
      name: "Hospital Requests",
      email: "hospital@nbts.lk",
      phone: "+94 11 2 699 193",
      topics: ["Blood requests", "Emergency coordination", "Hospital support"]
    },
    {
      name: "Technical Support",
      email: "support@praana.lk",
      phone: "+94 11 2 699 194",
      topics: ["App issues", "Account problems", "Technical help"]
    },
    {
      name: "Emergency Line",
      email: "emergency@nbts.lk",
      phone: "+94 11 2 692 661",
      topics: ["Blood emergencies", "Critical requests", "Urgent needs"]
    },
    {
      name: "Recruitment",
      email: "recruitment@nbts.lk",
      phone: "+94 11 2 699 195",
      topics: ["Job opportunities", "Volunteering", "Partnerships"]
    }
  ];

  return (
    <div className="min-h-screen page-shell">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-rose-700 text-white py-16 md:py-24">
        <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-0 -right-10 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-red-100">We're here to help. Get in touch with the right team</p>
        </div>
      </section>

      {/* Quick Contact Methods */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Quick Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div key={index} className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-brand-300 hover:shadow-soft transition-all text-center">
                  <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{method.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                  <p className="font-semibold text-brand-600 text-sm mb-1">{method.detail}</p>
                  <p className="text-xs text-gray-500">{method.subDetail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-gray-50 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="How can we help?"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Your message..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Departments */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Contact by Department</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <div key={index} className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-soft transition-all">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{dept.name}</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-600" />
                    <a href={`tel:${dept.phone}`} className="text-brand-600 hover:text-brand-700 font-medium text-sm">
                      {dept.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-600" />
                    <a href={`mailto:${dept.email}`} className="text-brand-600 hover:text-brand-700 font-medium text-sm">
                      {dept.email}
                    </a>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-600 uppercase mb-2">We handle:</p>
                  <ul className="space-y-1">
                    {dept.topics.map((topic, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-1">
                        <span className="text-brand-600">•</span> {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="bg-gray-50 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Locations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {locations.map((location, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-soft transition-all">
                <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-rose-700 h-20 flex items-center px-6">
                  <span className="text-white font-semibold">{location.type}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{location.name}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-gray-700">{location.address}</p>
                        <p className="text-gray-700">{location.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-brand-600 shrink-0" />
                      <a href={`tel:${location.phone}`} className="text-brand-600 hover:text-brand-700 font-medium">
                        {location.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-brand-600 shrink-0" />
                      <p className="text-gray-700">{location.hours}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Back Button */}
      <section className="py-8 px-4 text-center">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
        >
          ← Back to Home
        </button>
      </section>
    </div>
  );
};

export default ContactUsPage;
