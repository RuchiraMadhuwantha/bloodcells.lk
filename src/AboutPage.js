import React from 'react';
import { Heart, Users, Award, Zap, MapPin, Phone, Mail, ChevronRight } from 'lucide-react';

const AboutPage = ({ onNavigate }) => {
  const values = [
    { icon: Heart, title: "Compassion", description: "We care deeply about saving lives and helping those in need." },
    { icon: Users, title: "Community", description: "Building a strong network of donors and medical professionals." },
    { icon: Award, title: "Excellence", description: "Maintaining the highest standards in blood collection and distribution." },
    { icon: Zap, title: "Innovation", description: "Using technology to make blood donation faster and more accessible." },
  ];

  const team = [
    { name: "Dr. Priyantha Silva", role: "Director, NBTS", bio: "20+ years in blood transfusion medicine" },
    { name: "Nirmala Jayawardene", role: "Operations Manager", bio: "Leading regional blood bank coordination" },
    { name: "Ravi Perera", role: "Tech Lead", bio: "Building digital solutions for blood donation" },
    { name: "Dr. Samanthi Fernando", role: "Medical Advisor", bio: "Ensuring donor and patient safety" },
  ];

  const milestones = [
    { year: "2015", event: "bloodcells.lk System Launched" },
    { year: "2018", event: "50+ Hospitals Connected" },
    { year: "2022", event: "AI Demand Prediction Introduced" },
    { year: "2024", event: "100,000+ Donations Coordinated" },
    { year: "2026", event: "Real-Time Emergency Response System" },
  ];

  return (
    <div className="min-h-screen page-shell bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-rose-700 text-white">
        <div className="absolute -top-12 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 right-0 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About BloodCells<span className="text-red-200">.lk</span></h1>
          <p className="text-lg text-red-100">BloodCells.lk &ndash; Dedicated to Saving Lives Across Sri Lanka</p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="bg-white p-8 rounded-2xl shadow-card border border-brand-50">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                To provide a safe, adequate, and timely supply of blood and blood products to all patients in need across Sri Lanka through a coordinated, efficient, and transparent system.
              </p>
              <button
                onClick={() => onNavigate('home')}
                className="mt-6 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-semibold transition-colors shadow-soft"
              >
                Back to Home
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-gradient-to-br from-brand-50 to-rose-50 p-8 rounded-2xl border border-brand-100">
              <h3 className="text-2xl font-bold text-brand-700 mb-4">By The Numbers</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2"><span className="text-brand-600 font-bold">10,000+</span> Blood donations annually</li>
                <li className="flex items-center gap-2"><span className="text-brand-600 font-bold">5,000+</span> Active donors registered</li>
                <li className="flex items-center gap-2"><span className="text-brand-600 font-bold">50+</span> Partner hospitals</li>
                <li className="flex items-center gap-2"><span className="text-brand-600 font-bold">15,000+</span> Lives saved</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-white py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <div key={i} className="bg-slate-50 p-8 rounded-2xl shadow-card border border-gray-100 hover:shadow-soft transition-shadow animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Journey</h2>
          <div className="space-y-6">
            {milestones.map((milestone, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-24 shrink-0">
                  <span className="text-2xl font-bold text-brand-600">{milestone.year}</span>
                </div>
                <div className="pb-6 border-l-2 border-brand-200 pl-6 relative">
                  <div className="w-4 h-4 bg-brand-600 rounded-full absolute -left-2.5 top-1 mt-1" />
                  <p className="text-lg text-gray-700">{milestone.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-white py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Leadership Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {team.map((member, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl shadow-card border border-gray-100 hover:shadow-soft transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm text-brand-600 font-medium mb-2">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-rose-700 text-white py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Get In Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <MapPin className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">Address</p>
              <p className="text-red-100">BloodCells.lk<br />Colombo, Sri Lanka</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <Phone className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">Phone</p>
              <p className="text-red-100">+94 11 2 699 191<br />+94 11 2 692 661</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <Mail className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">Email</p>
              <p className="text-red-100">info@nbts.lk<br />support@bloodcells.lk</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
