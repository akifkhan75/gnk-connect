import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface FAQItem {
  question: string;
  answer: string;
  category: 'umrah' | 'visas' | 'tours' | 'general';
}

const FAQS: FAQItem[] = [
  {
    category: 'umrah',
    question: 'What is included in the Executive Umrah VIP Package?',
    answer: 'Our Executive Umrah VIP Package includes 5-star luxury hotel accommodation facing the Haram courtyard (Clock Tower in Makkah and Front Row in Madinah), private GMC Suburban transfers (Jeddah–Makkah–Madinah–Airport), complete Umrah e-visa processing, mandatory health insurance, private guided Ziarat tours with an experienced multilingual scholar, and 24/7 dedicated on-ground concierge support.'
  },
  {
    category: 'umrah',
    question: 'How far in advance should we book our Umrah package?',
    answer: 'We recommend booking at least 3 to 4 weeks in advance for regular months, and 6 to 8 weeks in advance for Ramadan or peak winter holiday seasons to secure premier 5-star Haram-view suites and optimal flight schedules.'
  },
  {
    category: 'visas',
    question: 'What documents are required for a Dubai (UAE) e-visa?',
    answer: 'For UAE e-visas, we require a clear color scan of your valid passport (minimum 6 months validity), a recent passport-size photograph with white background, and your CNIC copy. Processing typically takes only 2 to 4 working days with zero embassy visit required.'
  },
  {
    category: 'visas',
    question: 'Do you provide mock interview preparation for Schengen visas?',
    answer: 'Yes! Our Schengen dossier preparation includes document audit, verifiable flight/hotel reservations, tailored cover letters, detailed day-by-day travel itineraries, and 1-on-1 mock interview coaching with our senior visa consultants to maximize your approval probability.'
  },
  {
    category: 'tours',
    question: 'What vehicles are used for Northern Pakistan domestic tours (Skardu/Hunza)?',
    answer: 'For couples and small families, we provide late-model Toyota Prado / Land Cruiser 4x4 vehicles with experienced mountain drivers. For group tours, we deploy luxury air-conditioned Toyota Coaster / Grand Cabin vehicles equipped with modern amenities.'
  },
  {
    category: 'general',
    question: 'Where is the GNK Connect office located and how do I contact an agent?',
    answer: 'Our executive office is located at Office #2, Mezzanine Floor, Junaid Plaza, Islamabad, Pakistan. You can contact us directly via telephone/WhatsApp at +92 51 6137232 or email us at info@gnkconnect.com. Our travel desk is operational Monday to Saturday from 9:00 AM to 6:00 PM.'
  }
];

export const FAQSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'umrah' | 'visas' | 'tours'>('all');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  const toggleFAQ = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-20 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-200">
            <HelpCircle size={14} /> Frequently Asked Questions
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-900 tracking-tight">
            Everything You Need To Know
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            Clear answers to common questions about Umrah logistics, visa requirements, and tour bookings.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {[
              { id: 'all', label: 'All Questions' },
              { id: 'umrah', label: 'Executive Umrah' },
              { id: 'visas', label: 'Visas & Documentation' },
              { id: 'tours', label: 'Tours & Logistics' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  setOpenIdx(0);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-navy-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIdx === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-50/40 via-white to-white shadow-md'
                    : 'border-gray-200/80 bg-white hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                  className="w-full p-5 text-left flex justify-between items-center gap-4 focus:outline-none"
                >
                  <span className="font-bold text-sm md:text-base text-navy-900 leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-full transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 bg-cyan-500 text-navy-900' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs md:text-sm text-gray-600 leading-relaxed border-t border-cyan-100/60 mt-1">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
