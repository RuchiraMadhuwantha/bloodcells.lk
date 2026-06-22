import React, { useState } from 'react';
import { Heart, CheckCircle, AlertCircle, Calendar, Users, TrendingUp, MapPin, ChevronRight, Droplet } from 'lucide-react';

const ForDonorsPage = ({ onNavigate }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const eligibilityRequirements = [
    {
      category: "Age & Weight",
      requirements: ["At least 18 years old", "Weigh at least 50 kg", "Maximum age: no upper limit for healthy donors"]
    },
    {
      category: "Health Screening",
      requirements: ["Blood pressure within normal range", "No recent illness or fever", "No active infections", "Hemoglobin level meets minimum (13.5 g/dL for males, 12.5 g/dL for females)"]
    },
    {
      category: "Medical History",
      requirements: ["No major surgeries in past 4 weeks", "No dental work in past 3 days", "No tattoos in past 12 months", "No blood transfusion in past 12 months"]
    },
    {
      category: "Lifestyle Factors",
      requirements: ["No drug use (IV or otherwise)", "Safe sexual practices", "Not pregnant or breastfeeding", "Not traveled to high-risk areas recently"]
    }
  ];

  const donationProcess = [
    {
      step: 1,
      title: "Registration",
      description: "Create your donor profile with basic information and medical history",
      time: "5 min"
    },
    {
      step: 2,
      title: "Health Screening",
      description: "Quick health check including blood pressure, temperature, and hemoglobin test",
      time: "5-10 min"
    },
    {
      step: 3,
      title: "Medical Interview",
      description: "Healthcare professional reviews your eligibility and answers questions",
      time: "5-10 min"
    },
    {
      step: 4,
      title: "Donation",
      description: "Donate blood in a safe, comfortable environment. You'll relax while approximately 450ml is collected.",
      time: "10-15 min"
    },
    {
      step: 5,
      title: "Recovery",
      description: "Enjoy refreshments and rest while your body begins to replenish blood cells",
      time: "10-15 min"
    }
  ];

  const benefits = [
    {
      icon: Heart,
      title: "Save Lives",
      description: "One blood donation can save up to 3 lives"
    },
    {
      icon: TrendingUp,
      title: "Health Benefits",
      description: "Regular donation can improve cardiovascular health and iron levels"
    },
    {
      icon: Droplet,
      title: "Impact Tracking",
      description: "See exactly how many lives your donations have helped save"
    },
    {
      icon: Users,
      title: "Community",
      description: "Join a community of compassionate people making a real difference"
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description: "Book appointments at times and locations that work for you"
    },
    {
      icon: CheckCircle,
      title: "Health Screening",
      description: "Get a free health check-up with every donation"
    }
  ];

  const faqs = [
    {
      question: "How often can I donate blood?",
      answer: "Whole blood donors can donate every 56 days (8 weeks). This allows your body enough time to replenish red blood cells. Some blood types, particularly O negative, are in such high demand that donors of those types might be asked to donate more frequently."
    },
    {
      question: "Does donating blood hurt?",
      answer: "Most donors say the needle feels like a slight pinch. The entire process is designed to be as comfortable as possible. Our trained staff will ensure your comfort throughout."
    },
    {
      question: "How long does the donation process take?",
      answer: "The actual donation takes about 10-15 minutes, but the entire process (check-in, screening, donation, and recovery) typically takes 45 minutes to 1 hour."
    },
    {
      question: "What happens to my blood after donation?",
      answer: "Your blood is tested for various infections and diseases, separated into components (red cells, plasma, platelets), and stored appropriately. It can then be used for patients in need."
    },
    {
      question: "Can I donate if I'm on medication?",
      answer: "Most medications don't prevent blood donation. However, certain medications (like blood thinners or antibiotics) may require a waiting period. Check with our healthcare staff during registration."
    },
    {
      question: "What should I do before donating?",
      answer: "Eat a healthy meal 2-3 hours before, stay hydrated by drinking water, get adequate sleep, and avoid heavy exercise on the day of donation. Also, bring a valid ID."
    },
    {
      question: "Who needs blood transfusions?",
      answer: "Blood is needed for surgery patients, accident victims, cancer patients receiving chemotherapy, and people with blood disorders. It's essential for emergency care and many medical treatments."
    },
    {
      question: "Is blood donation safe?",
      answer: "Yes, blood donation is safe. All equipment is sterile and single-use. Our medical staff follows strict safety protocols. Donors are screened thoroughly to ensure safety for both donors and recipients."
    }
  ];

  return (
    <div className="min-h-screen page-shell">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-800 text-white py-16 md:py-24">
        <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-4 right-4 w-72 h-72 rounded-full bg-red-500/20 blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">For Donors</h1>
          <p className="text-lg text-red-100">Everything you need to know about blood donation and saving lives</p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Donate Blood?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="bg-white border-2 border-gray-100 rounded-lg p-6 hover:border-red-300 hover:shadow-lg transition-all">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="bg-gray-50 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Eligibility Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {eligibilityRequirements.map((section, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {section.category}
                </h3>
                <ul className="space-y-3">
                  {section.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-600 font-bold mt-1">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
            <p className="text-gray-700">
              <strong>Not sure if you're eligible?</strong> Use our eligibility checker or speak with our healthcare staff who can assess your individual situation.
            </p>
          </div>
        </div>
      </section>

      {/* Donation Process */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">The Donation Process</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-red-200" style={{ height: `${donationProcess.length * 160}px` }} />
            
            <div className="space-y-8 md:space-y-12">
              {donationProcess.map((item, index) => (
                <div key={index} className="relative">
                  <div className="flex gap-8">
                    {/* Timeline dot */}
                    <div className="hidden md:flex flex-col items-center w-20 shrink-0">
                      <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold relative z-10">
                        {item.step}
                      </div>
                      {index < donationProcess.length - 1 && (
                        <div className="text-gray-400 text-2xl mt-2">↓</div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 bg-white border-2 border-gray-100 rounded-lg p-6 md:p-8 hover:border-red-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                        <span className="text-sm text-red-600 font-medium">{item.time}</span>
                      </div>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-gray-50 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-bold text-gray-900 text-left">{faq.question}</h3>
                  <ChevronRight className={`w-5 h-5 text-red-600 transition-transform ${expandedFaq === index ? 'rotate-90' : ''}`} />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Save Lives?</h2>
          <p className="text-lg text-red-100 mb-8">Register today and book your first donation appointment</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => onNavigate('register')} className="px-8 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-all">
              Become a Donor
            </button>
            <button onClick={() => onNavigate('register')} className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all">
              Book Appointment
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

export default ForDonorsPage;
