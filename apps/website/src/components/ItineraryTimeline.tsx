import React, { useState } from 'react';
import { Clock, MapPin, CheckCircle2 } from 'lucide-react';

export interface TimelineDay {
  day: number;
  title: string;
  location: string;
  highlights: string[];
}

export const UMRAH_TIMELINE: TimelineDay[] = [
  {
    day: 1,
    title: 'Arrival in Jeddah & VIP Transfer to Makkah',
    location: 'Jeddah International Airport / Makkah',
    highlights: [
      'Meet & Greet assistance by GNK executive ground team at terminal',
      'Private GMC Suburban transfer directly to Clock Tower Hotel',
      'Express VIP check-in with Haram courtyard proximity',
      'Rest & evening orientation for Umrah rituals'
    ]
  },
  {
    day: 2,
    title: 'Performance of Umrah Rituals',
    location: 'Masjid Al-Haram, Makkah',
    highlights: [
      'Accompanied Tawaf and Sa’i guidance with scholar assistance',
      'Tahallul completion',
      'Personal prayer time inside the Holy Mosque'
    ]
  },
  {
    day: 3,
    title: 'Guided Historical Makkah Ziarat',
    location: 'Makkah Al-Mukarramah',
    highlights: [
      'Visit to Cave Hira (Jabal Al-Noor) & Jabal Thawr',
      'Mina, Muzdalifah, and Mount Arafat (Jabal Al-Rahmah)',
      'Jannat Al-Mualla historical cemetery',
      'Return to hotel for Maghrib and Isha in Haram'
    ]
  },
  {
    day: 4,
    title: 'Haramain High-Speed Train to Madinah',
    location: 'Makkah to Madinah Munawwarah',
    highlights: [
      'Executive transfer to Makkah Railway Station',
      '1st Class Haramain Train Journey (under 2.5 hours)',
      'Arrival in Madinah & check-in at 5-star hotel facing the Prophet’s Mosque',
      'First Salam at Al-Masjid an-Nabawi & Rawdah Ash-Sharifah entrance'
    ]
  },
  {
    day: 5,
    title: 'Sacred Madinah Ziarat Tour',
    location: 'Madinah Munawwarah',
    highlights: [
      'Masjid Quba (First Mosque of Islam, 2 Rakat Sunnah)',
      'Masjid Al-Qiblatayn (The Mosque of the Two Qiblas)',
      'Mount Uhud & Martyrs Cemetery (Sayyid Shuhada)',
      'Dates Market (Souq Al-Tumoor) shopping excursion'
    ]
  },
  {
    day: 6,
    title: 'Farewell & Airport Departure',
    location: 'Prince Mohammad Bin Abdulaziz Airport, Madinah',
    highlights: [
      'Farewell prayers at the Prophet’s Mosque',
      'Assisted check-out & Zamzam water arrangements',
      'VIP transfer to Madinah / Jeddah International Airport'
    ]
  }
];

export const ItineraryTimeline: React.FC<{ items?: TimelineDay[] }> = ({ items = UMRAH_TIMELINE }) => {
  const [activeDay, setActiveDay] = useState<number>(1);

  return (
    <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-10 border border-navy-800 shadow-2xl relative overflow-hidden">
      <div className="mb-8">
        <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs block mb-1">
          Structured Travel Schedule
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Day-by-Day Journey Timeline
        </h3>
        <p className="text-gray-300 text-xs sm:text-sm mt-1">
          Explore the curated daily itinerary, sacred stops, and luxury accommodations.
        </p>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        {items.map((item) => (
          <button
            key={item.day}
            type="button"
            onClick={() => setActiveDay(item.day)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeDay === item.day
                ? 'bg-cyan-500 text-navy-900 shadow-lg shadow-cyan-500/25 scale-105'
                : 'bg-navy-800 text-gray-300 border border-navy-700 hover:bg-navy-700'
            }`}
          >
            <span>Day {item.day}</span>
          </button>
        ))}
      </div>

      {/* Active Day Detail Card */}
      {items.map((item) => {
        if (item.day !== activeDay) return null;
        return (
          <div key={item.day} className="bg-navy-800/90 rounded-2xl p-6 border border-navy-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-navy-700">
              <div>
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                  <Clock size={14} /> Day {item.day} Schedule
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white">{item.title}</h4>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-gray-300 bg-navy-900 px-3 py-1.5 rounded-lg border border-navy-700 self-start sm:self-auto">
                <MapPin size={14} className="text-cyan-400" />
                <span>{item.location}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Daily Highlights & Services:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {item.highlights.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-navy-900/60 border border-navy-700/60 text-xs text-gray-200">
                    <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ItineraryTimeline;
