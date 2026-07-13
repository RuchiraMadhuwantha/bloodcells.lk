import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

import news1 from '../assets/news/news-1.svg';
import news2 from '../assets/news/news-2.svg';
import news3 from '../assets/news/news-3.svg';
import news4 from '../assets/news/news-4.svg';
import news5 from '../assets/news/news-5.svg';
import news6 from '../assets/news/news-6.svg';
import news7 from '../assets/news/news-7.svg';
import news8 from '../assets/news/news-8.svg';

/*
  Blood Donation News & Updates
  Frontend-only automatic carousel. Replaces the old "Our Progress" block.
  Sample news items only — structured for later replacement with real
  database content / a news management feature / an approved external API.
*/

const NEWS = [
  {
    category: 'Campaign',
    date: 'Jul 20, 2026',
    headline: 'Join Our Upcoming Community Blood Donation Campaign',
    description:
      'Voluntary donors are invited to participate in an upcoming campaign supporting the availability of blood for patients in need.',
    image: news1,
    alt: 'Community blood donation campaign announcement',
  },
  {
    category: 'Awareness',
    date: 'Jul 14, 2026',
    headline: 'Why Regular Blood Donation Matters',
    description:
      'Continuous voluntary donor participation plays an important role in maintaining adequate blood supplies for hospitals.',
    image: news2,
    alt: 'Awareness message about regular blood donation',
  },
  {
    category: 'Donor Education',
    date: 'Jul 09, 2026',
    headline: 'Know Before You Donate: Understanding Donor Eligibility',
    description:
      'Learn about the general screening process and preparation involved before making a blood donation.',
    image: news3,
    alt: 'Donor eligibility education information',
  },
  {
    category: 'Healthcare',
    date: 'Jul 03, 2026',
    headline: 'Improving Coordination Between Hospitals and Blood Banks',
    description:
      'Digital blood management platforms can support better communication and coordination of blood requests.',
    image: news4,
    alt: 'Coordination between hospitals and blood banks',
  },
  {
    category: 'Donor Guide',
    date: 'Jun 27, 2026',
    headline: 'Simple Ways to Prepare for a Blood Donation',
    description:
      'Being informed about the donation process can help donors prepare for their appointment.',
    image: news5,
    alt: 'Guide on preparing for a blood donation',
  },
  {
    category: 'Technology',
    date: 'Jun 21, 2026',
    headline: 'How Digital Platforms Support Blood Donation Management',
    description:
      'Centralized digital systems can help connect donors, hospitals, and blood bank services more efficiently.',
    image: news6,
    alt: 'Technology supporting blood donation management',
  },
  {
    category: 'Community',
    date: 'Jun 15, 2026',
    headline: 'Building Stronger Communities Through Voluntary Blood Donation',
    description:
      'Community participation and awareness campaigns play an important role in encouraging voluntary blood donation.',
    image: news7,
    alt: 'Community building through voluntary blood donation',
  },
  {
    category: 'Education',
    date: 'Jun 08, 2026',
    headline: 'Why Understanding Blood Groups Is Important',
    description:
      'Blood group information is an essential part of blood donation and transfusion management.',
    image: news8,
    alt: 'Education about understanding blood groups',
  },
];

const ROTATE_INTERVAL = 5000;

const NewsCarousel = () => {
  const total = NEWS.length;
  const items = [...NEWS, NEWS[0]]; // cloned first slide for seamless loop

  const [index, setIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setIdx = (val, instant = false) => {
    indexRef.current = val;
    setNoTransition(instant);
    setIndex(val);
  };

  const advance = () => {
    if (indexRef.current >= total) {
      setIdx(0, true); // jump back from clone without sliding
    } else {
      setIdx(indexRef.current + 1, false);
    }
  };

  const goTo = (next) => {
    setIdx(((next % total) + total) % total, false);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (paused || reduceMotion) return;
    timerRef.current = setInterval(advance, ROTATE_INTERVAL);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, reduceMotion]);

  const current = index % total;
  const trackStyle = {
    transform: `translateX(-${index * (100 / items.length)}%)`,
    transition: noTransition || reduceMotion ? 'none' : 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-md border border-red-50">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Blood Donation News &amp; Updates</h2>
        <p className="text-gray-500 leading-relaxed max-w-2xl">
          Stay informed with the latest blood donation campaigns, awareness updates, and community news.
        </p>
      </div>

      {/* Carousel */}
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="overflow-hidden rounded-2xl border border-red-50">
          <div className="flex h-full" style={trackStyle}>
            {items.map((item, i) => (
              <div
                key={i}
                className="w-full flex-shrink-0 flex flex-col md:flex-row bg-white"
                aria-hidden={i !== index}
              >
                <div className="relative w-full md:w-[45%] h-56 md:h-auto">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {item.category}
                  </span>
                </div>
                <div className="w-full md:w-[55%] p-6 md:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>{item.date}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 leading-snug">
                    {item.headline}
                  </h3>
                  <p className="text-gray-500 leading-relaxed mb-5">{item.description}</p>
                  <button
                    type="button"
                    className="self-start inline-flex items-center gap-2 text-red-600 font-semibold group"
                    style={{ transition: 'gap 0.2s' }}
                  >
                    Read More
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1" style={{ transition: 'transform 0.2s' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Previous / Next arrows */}
        <button
          type="button"
          onClick={() => goTo(indexRef.current - 1)}
          aria-label="Previous news"
          className="absolute top-1/2 -translate-y-1/2 left-2 sm:-left-4 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          style={{ transition: 'all 0.2s' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(indexRef.current + 1)}
          aria-label="Next news"
          className="absolute top-1/2 -translate-y-1/2 right-2 sm:-right-4 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          style={{ transition: 'all 0.2s' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Pagination indicators */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {NEWS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to news ${i + 1}`}
            aria-current={current === i}
            className={`h-2.5 rounded-full transition-all ${
              current === i ? 'w-7 bg-red-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
            }`}
            style={{ transition: 'all 0.3s' }}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsCarousel;
