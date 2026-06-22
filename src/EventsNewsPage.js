import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Users, ChevronRight, Search, Tag } from 'lucide-react';

const EventsNewsPage = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const events = [
    {
      id: 1,
      title: "Colombo Mega Blood Drive 2026",
      date: "Jun 24, 2026",
      time: "8:00 AM - 6:00 PM",
      location: "BMICH, Colombo",
      type: "event",
      status: "upcoming",
      image: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
      description: "The largest blood donation drive of the year featuring multiple donation booths, medical screening stations, and refreshments.",
      attendees: "2,500+"
    },
    {
      id: 2,
      title: "University of Kelaniya Blood Donation Camp",
      date: "Jul 02, 2026",
      time: "10:00 AM - 4:00 PM",
      location: "Kelaniya Campus",
      type: "event",
      status: "registering",
      image: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      description: "Campus-wide donation initiative targeting student donors. Free health check-up and certificates provided.",
      attendees: "500+"
    },
    {
      id: 3,
      title: "Corporate Donation Week 2026",
      date: "Jul 15, 2026",
      time: "9:00 AM - 5:00 PM",
      location: "World Trade Center, Colombo",
      type: "event",
      status: "upcoming",
      image: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      description: "Week-long corporate initiative encouraging businesses to organize donation teams with office competitions.",
      attendees: "1,000+"
    },
    {
      id: 4,
      title: "Summer Blood Donation Campaign",
      date: "Starting Aug 1, 2026",
      time: "All day",
      location: "Multiple centers",
      type: "campaign",
      status: "upcoming",
      image: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      description: "Regional campaign across all blood banks to boost inventory during summer vacation season.",
      attendees: "5,000+"
    }
  ];

  const news = [
    {
      id: 1,
      title: "New AI Prediction Model Reduces Blood Shortages by 40%",
      date: "Jun 15, 2026",
      category: "Technology",
      summary: "PRAANA's latest AI update successfully predicted demand patterns with 95% accuracy, helping prevent stockouts.",
      icon: "📊"
    },
    {
      id: 2,
      title: "Emergency Blood Request System Saves Lives in Kandy",
      date: "Jun 12, 2026",
      category: "Success Story",
      summary: "Real-time coordination through PRAANA enabled emergency blood delivery in just 15 minutes, saving a critical patient.",
      icon: "❤️"
    },
    {
      id: 3,
      title: "50th Partner Hospital Joins PRAANA Network",
      date: "Jun 10, 2026",
      category: "Network",
      summary: "Western Province Hospital becomes the 50th facility to join the integrated blood transfusion system.",
      icon: "🏥"
    },
    {
      id: 4,
      title: "Donor Retention Program Shows 60% Success Rate",
      date: "Jun 08, 2026",
      category: "Achievement",
      summary: "New follow-up and incentive system encourages repeat donations, significantly boosting donor participation.",
      icon: "🎯"
    },
    {
      id: 5,
      title: "Mobile Donation Units Reach Remote Areas",
      date: "Jun 05, 2026",
      category: "Expansion",
      summary: "PRAANA now coordinates 12 mobile blood collection units serving rural regions of Sri Lanka.",
      icon: "🚐"
    },
    {
      id: 6,
      title: "100,000 Donations Milestone Achieved",
      date: "Jun 01, 2026",
      category: "Milestone",
      summary: "PRAANA celebrates coordinating 100,000 successful blood donations since system launch.",
      icon: "🎉"
    }
  ];

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Events', value: 'event' },
    { label: 'Campaigns', value: 'campaign' },
  ];

  const newsCategories = [
    'All', 'Technology', 'Success Story', 'Network', 'Achievement', 'Expansion', 'Milestone'
  ];

  const filteredEvents = selectedCategory === 'all' 
    ? events 
    : events.filter(e => e.type === selectedCategory);

  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-700',
    registering: 'bg-amber-100 text-amber-700',
    active: 'bg-green-100 text-green-700'
  };

  return (
    <div className="min-h-screen page-shell">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-800 text-white py-16 md:py-24">
        <div className="absolute -top-10 -left-8 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-red-500/15 blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Events & News</h1>
          <p className="text-lg text-red-100">Stay updated on blood donation campaigns and system developments</p>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Upcoming Events & Campaigns</h2>
            <div className="flex gap-3 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredEvents.map(event => (
              <div key={event.id} className="bg-white border-2 border-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                <div className="h-32 md:h-40" style={{ background: event.image }} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusColors[event.status]}`}>
                      {event.status}
                    </span>
                    <span className="text-xs text-gray-500">{event.type}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{event.description}</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-600" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-red-600" />
                      Expected: {event.attendees}
                    </div>
                  </div>
                  {event.status === 'registering' && (
                    <button onClick={() => onNavigate('register')} className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors">
                      Register Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="bg-gray-50 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Latest News</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {news.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-red-600 uppercase">{item.category}</span>
                    <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{item.summary}</p>
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stay Informed</h2>
          <p className="text-red-100 mb-8">Subscribe to our newsletter for updates on events, campaigns, and system improvements.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none"
            />
            <button className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Subscribe
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

export default EventsNewsPage;
