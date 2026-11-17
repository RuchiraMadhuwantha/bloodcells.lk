import React, { useEffect, useState } from 'react';
import { listPublicCampaigns } from './services/api';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';

const EventsNewsPage = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [resource, setResource] = useState({ loading: true, error: '', campaigns: [] });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setResource({ loading: true, error: '', campaigns: [] });
    listPublicCampaigns().then((data) => {
      if (!Array.isArray(data?.campaigns)) throw new Error('The server did not return campaign records.');
      if (active) setResource({ loading: false, error: '', campaigns: data.campaigns });
    }).catch((error) => {
      if (active) setResource({ loading: false, error: error.message, campaigns: [] });
    });
    return () => { active = false; };
  }, [revision]);
  const events = resource.campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title || campaign.name,
    date: campaign.date,
    time: `${campaign.startTime} - ${campaign.endTime}`,
    location: [campaign.venueName, campaign.address, campaign.district].filter(Boolean).join(', '),
    type: 'campaign',
    status: campaign.status.toLowerCase(),
    imageUrl: campaign.image,
    image: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    description: campaign.shortDescription,
    attendees: campaign.targetDonors || 'Not specified',
  }));

  const news = [
    {
      id: 2,
      title: "Emergency Blood Request System Saves Lives in Kandy",
      date: "Jun 12, 2026",
      category: "Success Story",
      summary: "Real-time coordination through BloodCells.lk enabled emergency blood delivery in just 15 minutes, saving a critical patient.",
      icon: "❤️"
    },
    {
      id: 3,
      title: "50th Partner Hospital Joins BloodCells.lk Network",
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
      summary: "BloodCells.lk now coordinates 12 mobile blood collection units serving rural regions of Sri Lanka.",
      icon: "🚐"
    },
    {
      id: 6,
      title: "100,000 Donations Milestone Achieved",
      date: "Jun 01, 2026",
      category: "Milestone",
      summary: "BloodCells.lk celebrates coordinating 100,000 successful blood donations since system launch.",
      icon: "🎉"
    }
  ];

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Events', value: 'event' },
    { label: 'Campaigns', value: 'campaign' },
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
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-rose-700 text-white py-16 md:py-24">
        <div className="absolute -top-10 -left-8 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
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
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <button className="mb-5 text-brand-600 underline disabled:opacity-50" disabled={resource.loading} onClick={() => setRevision((r) => r + 1)}>Refresh campaigns</button>
          {resource.loading && <p role="status">Loading campaigns...</p>}
          {resource.error && <p role="alert" className="mb-5 text-red-700">{resource.error} Use Refresh campaigns to retry.</p>}
          {!resource.loading && !resource.error && filteredEvents.length === 0 && <p role="status">No published {selectedCategory === 'event' ? 'events' : 'campaigns'} available.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredEvents.map(event => (
              <div key={event.id} className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:shadow-soft transition-all">
                {event.imageUrl ? <img src={event.imageUrl} alt={event.title} className="w-full h-32 md:h-40 object-cover" /> : <div className="h-32 md:h-40" style={{ background: event.image }} />}
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
                      <Calendar className="w-4 h-4 text-brand-600" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-600" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-600" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-600" />
                      Expected: {event.attendees}
                    </div>
                  </div>
                  {['upcoming', 'active'].includes(event.status) && (
                    <button onClick={() => onNavigate('donor-campaigns')} className="mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-2xl font-medium transition-colors">
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
              <div key={item.id} className="bg-white rounded-2xl shadow-card p-6 hover:shadow-soft transition-all">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-brand-600 uppercase">{item.category}</span>
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
      <section className="bg-gradient-to-r from-brand-700 via-brand-600 to-rose-700 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stay Informed</h2>
          <p className="text-red-100 mb-8">Subscribe to our newsletter for updates on events, campaigns, and system improvements.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-2xl text-gray-900 focus:outline-none"
            />
            <button className="px-6 py-3 bg-white text-brand-600 rounded-2xl font-semibold hover:bg-gray-100 transition-colors">
              Subscribe
            </button>
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

export default EventsNewsPage;
