import React, { useState } from 'react';
import {
  Droplet, Users, Calendar, Heart, CheckCircle,
  Clock, Phone, MapPin, ChevronDown, ChevronUp,
  Star, Shield, Activity, AlertCircle,
} from 'lucide-react';
import heroImage from './assets/hero.jpg';
import communityCareImage from './assets/community-care.svg';
import NewsCarousel from './components/NewsCarousel';

/* ─────────────────────────────────────────────
   Helper: Section Header
───────────────────────────────────────────── */
const SectionHeader = ({ tag, title, subtitle }) => (
  <div className="text-center mb-12">
    {tag && (
      <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
        {tag}
      </span>
    )}
    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>
    {subtitle && <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const Homepage = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState(null);

  /* ── Stats ── */
  const stats = [
    { icon: Droplet, value: '10,000+', label: 'Blood Donations',   color: 'text-red-600',   bg: 'bg-red-50'   },
    { icon: Users,   value: '5,000+',  label: 'Active Donors',     color: 'text-blue-600',  bg: 'bg-blue-50'  },
    { icon: Heart,   value: '50+',     label: 'Partner Hospitals',  color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Shield,  value: '15,000+', label: 'Lives Saved',        color: 'text-pink-600',  bg: 'bg-pink-50'  },
  ];

  /* ── How It Works ── */
  const steps = [
    { step: '01', icon: CheckCircle, title: 'Register Online',   desc: 'Create your donor profile in under 2 minutes. Provide basic health information to get started.',              color: 'text-red-500'    },
    { step: '02', icon: Calendar,    title: 'Book Appointment',  desc: 'Choose a convenient date, time, and nearby donation centre or partner hospital.',                            color: 'text-orange-500' },
    { step: '03', icon: Activity,    title: 'Health Screening',  desc: 'A quick on-site health check ensures you and the recipient are safe throughout the process.',               color: 'text-yellow-500' },
    { step: '04', icon: Droplet,     title: 'Donate Blood',      desc: "The donation itself takes only 8\u201310 minutes. Relax \u2014 you're saving up to 3 lives!",              color: 'text-red-600'    },
  ];

  /* ── Blood Types ── */
  const bloodTypes = [
    { type: 'A+',  canDonateTo: ['A+', 'AB+'],                canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],   freq: '35.7%' },
    { type: 'A-',  canDonateTo: ['A+', 'A-', 'AB+', 'AB-'],  canReceiveFrom: ['A-', 'O-'],                freq: '6.3%'  },
    { type: 'B+',  canDonateTo: ['B+', 'AB+'],                canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],   freq: '8.5%'  },
    { type: 'B-',  canDonateTo: ['B+', 'B-', 'AB+', 'AB-'],  canReceiveFrom: ['B-', 'O-'],                freq: '1.5%'  },
    { type: 'AB+', canDonateTo: ['AB+'],                      canReceiveFrom: ['All Types'],               freq: '3.4%'  },
    { type: 'AB-', canDonateTo: ['AB+', 'AB-'],               canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'],  freq: '0.6%'  },
    { type: 'O+',  canDonateTo: ['A+', 'B+', 'O+', 'AB+'],   canReceiveFrom: ['O+', 'O-'],                freq: '37.4%' },
    { type: 'O-',  canDonateTo: ['All Types'],                canReceiveFrom: ['O-'],                      freq: '6.6%'  },
  ];

  /* ── Testimonials ── */
  const testimonials = [
    {
      name: 'Kasun Perera',
      role: 'Regular Donor \u2013 Colombo',
      quote: "I've been donating for 5 years. This platform made scheduling effortless. Knowing my blood reaches someone in crisis is deeply fulfilling.",
      rating: 5,
      avatar: '\uD83D\uDC68\u200D\uD83D\uDCBC',
    },
    {
      name: 'Dr. Nimasha Silva',
      role: 'Surgeon \u2013 Kandy Teaching Hospital',
      quote: 'BloodCells.lk drastically reduced our blood procurement time during emergencies. It\u2019s a game-changer for our surgical teams.',
      rating: 5,
      avatar: '\uD83D\uDC69\u200D\u2695\uFE0F',
    },
    {
      name: 'Thilini Jayawardena',
      role: 'Mother of a Thalassemia patient',
      quote: 'My daughter needs regular transfusions. This system connects us with verified donors instantly. We are eternally grateful.',
      rating: 5,
      avatar: '\uD83D\uDC69\u200D\uD83D\uDC67',
    },
  ];

  /* ── Eligibility ── */
  const eligibilityYes = [
    'Aged 18\u201360 years',
    'Weight above 50 kg',
    'Haemoglobin \u2265 12.5 g/dL',
    'In good general health',
    'Not donated in past 3 months',
    'Normal blood pressure (80\u2013160 / 60\u2013100)',
  ];
  const eligibilityNo = [
    'Currently pregnant or nursing',
    'Recent surgery within 6 months',
    'Diagnosed with HIV, Hepatitis B/C',
    'Under certain medications',
    'Recently travelled to a malaria zone',
    'Alcohol consumption in past 48 hours',
  ];

  /* ── Events ── */
  const events = [
    { date: 'Jul 20', day: 'Sunday',   title: 'Colombo Blood Drive',      location: 'National Hospital, Colombo 10', slots: 40,  color: 'border-red-500'    },
    { date: 'Jul 26', day: 'Saturday', title: 'Kandy Community Drive',     location: 'Kandy Teaching Hospital',       slots: 25,  color: 'border-orange-500' },
    { date: 'Aug 3',  day: 'Sunday',   title: 'Galle Blood Donation Camp', location: 'Karapitiya Hospital, Galle',    slots: 30,  color: 'border-pink-500'   },
    { date: 'Aug 15', day: 'Friday',   title: 'Independence Day Special',  location: 'All Major Centres',             slots: 200, color: 'border-red-700'    },
  ];

  /* ── FAQ ── */
  const faqs = [
    { q: 'How often can I donate blood?',               a: 'Whole blood donors can donate every 3 months (90 days). Platelet donors can donate more frequently, up to 24 times per year.'                                          },
    { q: 'Does blood donation hurt?',                    a: 'You may feel a brief pinch when the needle is inserted. The donation process itself is painless, and most donors feel comfortable throughout.'                          },
    { q: 'How long does the process take?',              a: 'The entire process (registration, screening, donation, rest) takes about 45\u201360 minutes. The actual blood draw takes only 8\u201310 minutes.'                      },
    { q: 'What should I do before donating?',            a: "Eat a healthy meal, drink plenty of water, and get a good night's sleep. Avoid fatty foods before donation and wear comfortable, loose-fitting clothing."               },
    { q: 'Is my blood type needed?',                     a: 'All blood types are needed! O-negative is the universal donor and always in high demand, but hospitals need every type regularly.'                                      },
    { q: 'Can I donate if I have a tattoo or piercing?', a: 'You can donate if your tattoo or piercing was done at a registered, sterile facility and it has been at least 4 months since the procedure.'                          },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <div
        className="relative overflow-hidden text-white py-20"
        style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)' }} />

        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm uppercase tracking-widest font-semibold">
                <Droplet className="w-4 h-4 fill-white" /> Emergency Blood Support
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                  Welcome to<br />
                  <span style={{ color: '#fecaca' }}>Blood Donation</span><br />
                  System
                </h1>
                <p className="mt-5 text-lg text-red-100 max-w-xl leading-relaxed">
                  A national platform for donors, hospitals, and blood banks to coordinate safe and timely blood supply across Sri Lanka.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('register')}
                  className="bg-white text-red-700 px-8 py-3.5 rounded-xl font-bold hover:bg-red-50 shadow-lg flex items-center gap-2"
                  style={{ transition: 'all 0.2s' }}
                >
                  <Calendar className="w-5 h-5" /> Book Appointment
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="border-2 border-white text-white px-8 py-3.5 rounded-xl font-bold hover:bg-white/10"
                  style={{ transition: 'all 0.2s' }}
                >
                  Become a Donor
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="border-2 border-white/50 text-white/90 px-8 py-3.5 rounded-xl font-semibold hover:bg-white hover:text-red-700"
                  style={{ transition: 'all 0.2s' }}
                >
                  Request Blood
                </button>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Blood Donation',     description: 'Support patients in need with safe blood units.',   image: heroImage },
                { title: 'Emergency Requests', description: 'Immediate response for urgent transfusion needs.',  image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80' },
                { title: 'Community Care',     description: 'Connecting donors, hospitals and blood banks.',     image: communityCareImage },
              ].map((item, i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-xl">
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

      {/* ═══════════════════════ STATS BAR ═══════════════════════ */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110`} style={{ transition: 'transform 0.2s' }}>
                  <s.icon className={`w-7 h-7 ${s.color}`} />
                </div>
                <div className="text-3xl font-extrabold text-gray-800">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ WHY IT MATTERS + PROGRESS ═══════════════════════ */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-8 rounded-3xl shadow-md border border-red-50">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Blood Donation Matters</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Every donation supports emergency surgeries, cancer treatment, and accident care across Sri Lanka. With every unit donated, we help save lives and keep our hospitals ready for the unexpected.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { val: '1 in 4',       desc: 'patients need blood transfusion',            bg: 'bg-red-50',    clr: 'text-red-600'    },
                  { val: 'Every 2 secs', desc: 'someone in Sri Lanka needs blood',            bg: 'bg-red-50',    clr: 'text-red-600'    },
                  { val: '3 lives',      desc: 'saved per single donation',                  bg: 'bg-orange-50', clr: 'text-orange-600' },
                  { val: '42 days',      desc: 'shelf life of donated red blood cells',       bg: 'bg-pink-50',   clr: 'text-pink-600'   },
                ].map((item, i) => (
                  <div key={i} className={`p-5 rounded-2xl ${item.bg}`}>
                    <p className={`text-2xl font-bold ${item.clr}`}>{item.val}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <NewsCarousel />
          </div>
        </div>
      </div>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            tag="Simple Process"
            title="How It Works"
            subtitle="Donating blood is quick, safe, and straightforward. Here's what to expect from start to finish."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-red-100 z-0" />
            {steps.map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                <div
                  className="w-20 h-20 rounded-full bg-red-50 border-4 border-white shadow-lg flex items-center justify-center mb-5 group-hover:scale-110"
                  style={{ boxShadow: '0 0 0 4px #fee2e2', transition: 'transform 0.2s' }}
                >
                  <s.icon className={`w-9 h-9 ${s.color}`} />
                </div>
                <span className="text-xs font-bold text-red-300 tracking-widest mb-2">STEP {s.step}</span>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => onNavigate('register')}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-red-700 shadow-lg"
              style={{ transition: 'all 0.2s' }}
            >
              <Droplet className="w-5 h-5" /> Start Donating Today
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ BLOOD TYPE CHART ═══════════════════════ */}
      <div className="py-20" style={{ background: 'linear-gradient(135deg,#fff1f2 0%,#fef2f2 100%)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            tag="Compatibility Guide"
            title="Blood Type Chart"
            subtitle="Understanding which blood types can donate to or receive from each other is crucial for safe transfusions."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bloodTypes.map((bt, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md border border-red-100 hover:shadow-xl hover:-translate-y-1"
                style={{ transition: 'all 0.25s' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-md">
                    {bt.type}
                  </div>
                  <span className="text-xs bg-red-50 text-red-600 font-semibold px-3 py-1 rounded-full">{bt.freq}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Can Donate To</p>
                    <div className="flex flex-wrap gap-1">
                      {bt.canDonateTo.map(t => (
                        <span key={t} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Can Receive From</p>
                    <div className="flex flex-wrap gap-1">
                      {bt.canReceiveFrom.map(t => (
                        <span key={t} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ELIGIBILITY ═══════════════════════ */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            tag="Am I Eligible?"
            title="Eligibility Requirements"
            subtitle="Check if you qualify to donate blood. Most healthy adults are eligible. Review the criteria below."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-green-50 border border-green-200 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-800">You Can Donate If&hellip;</h3>
              </div>
              <ul className="space-y-3">
                {eligibilityYes.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-red-800">You Should Wait If&hellip;</h3>
              </div>
              <ul className="space-y-3">
                {eligibilityNo.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            * Not sure? Our health staff will assess you on arrival. Always consult your doctor if in doubt.
          </p>
        </div>
      </div>

      {/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */}
      <div className="py-20" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-indigo-800 text-indigo-200 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Real Stories
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What People Say</h2>
            <p className="text-indigo-300 max-w-2xl mx-auto leading-relaxed">
              Stories from donors, doctors, and families who&apos;ve experienced the impact of blood donation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-3xl p-8 flex flex-col hover:bg-white/15 hover:-translate-y-1"
                style={{ transition: 'all 0.25s' }}
              >
                <div className="flex mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-indigo-100 leading-relaxed italic flex-1 mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">{t.avatar}</div>
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-indigo-300">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ UPCOMING EVENTS ═══════════════════════ */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            tag="Join Us"
            title="Upcoming Blood Drives"
            subtitle="Find a donation event near you and sign up to help save lives in your community."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-6 shadow-md border-l-4 ${ev.color} flex items-center gap-6 hover:shadow-xl hover:-translate-y-0.5`}
                style={{ transition: 'all 0.2s' }}
              >
                <div className="flex-shrink-0 text-center w-16">
                  <div className="text-3xl font-extrabold text-red-600 leading-none">{ev.date.split(' ')[1]}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{ev.date.split(' ')[0]}</div>
                  <div className="text-xs text-gray-500 mt-1">{ev.day}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{ev.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-green-600 mt-1">
                    <Users className="w-4 h-4" />
                    <span>{ev.slots} slots available</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('register')}
                  className="flex-shrink-0 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700"
                  style={{ transition: 'background 0.2s' }}
                >
                  Register
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ CTA BANNER ═══════════════════════ */}
      <div
        className="relative overflow-hidden py-20 text-white"
        style={{ background: 'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%,white 0%,transparent 60%),radial-gradient(circle at 80% 20%,white 0%,transparent 50%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Droplet className="w-10 h-10 text-white fill-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Every Drop Counts</h2>
          <p className="text-xl text-red-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Your single donation can save up to 3 lives. Join thousands of heroes across Sri Lanka who give the gift of life every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('register')}
              className="bg-white text-red-700 px-10 py-4 rounded-xl font-extrabold text-lg hover:bg-red-50 shadow-xl"
              style={{ transition: 'all 0.2s' }}
            >
              Donate Blood Now
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="border-2 border-white text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/10"
              style={{ transition: 'all 0.2s' }}
            >
              Request Blood
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <div className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4">
          <SectionHeader
            tag="Got Questions?"
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about blood donation, safety, and the process."
          />
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50"
                  style={{ transition: 'background 0.15s' }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-800">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-5 h-5 text-red-500 flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 pt-4 text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Droplet className="w-8 h-8 text-red-500 fill-red-500" />
                <span className="text-2xl font-extrabold">BloodCells<span className="text-red-500">.lk</span></span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">National Blood Transfusion Service &ndash; Sri Lanka. Saving lives, one drop at a time.</p>
              <div className="flex gap-3 mt-5">
                {['FB', 'TW', 'IG'].map(s => (
                  <div key={s} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-red-600 cursor-pointer" style={{ transition: 'background 0.2s' }}>
                    <span className="text-xs font-bold">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-5">Quick Links</h3>
              <div className="space-y-3 text-sm text-gray-400">
                {[
                  { label: 'About Us',     nav: 'about'    },
                  { label: 'Find a Drive', nav: 'register' },
                  { label: 'Donor Login',  nav: 'login'    },
                  { label: 'Register',     nav: 'register' },
                ].map(l => (
                  <button
                    key={l.label}
                    onClick={() => onNavigate(l.nav)}
                    className="block hover:text-white"
                    style={{ transition: 'color 0.15s' }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-5">Contact Us</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-red-400" />
                  <span>+94 11 269 5671</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-red-400" />
                  <span>Open 24/7 for emergencies</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-red-400" />
                  <span>Narahenpita, Colombo 05, Sri Lanka</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-5">Blood Bank Centres</h3>
              <div className="space-y-2 text-sm text-gray-400">
                {['Colombo (HQ)', 'Kandy', 'Galle', 'Jaffna', 'Kurunegala', 'Ratnapura'].map(loc => (
                  <div key={loc} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span>{loc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} BloodCells.lk &mdash; National Blood Transfusion Service, Sri Lanka. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer" style={{ transition: 'color 0.15s' }}>Privacy Policy</span>
              <span className="hover:text-white cursor-pointer" style={{ transition: 'color 0.15s' }}>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
