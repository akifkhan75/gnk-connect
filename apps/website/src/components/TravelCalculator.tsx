import React, { useState, useMemo } from 'react';
import { Calculator, Moon, Map, Globe, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { BRAND_NAME } from '../constants';

interface TravelCalculatorProps {
  onBookEstimate: (summary: string, estimatedPrice: number) => void;
}

type TripCategory = 'umrah' | 'domestic' | 'international';
type HotelTier = 'standard' | 'premium' | 'luxury';
type TransportMode = 'shared' | 'sedan' | 'vip';

const TravelCalculator: React.FC<TravelCalculatorProps> = ({ onBookEstimate }) => {
  const [category, setCategory] = useState<TripCategory>('umrah');
  const [hotelTier, setHotelTier] = useState<HotelTier>('luxury');
  const [duration, setDuration] = useState<number>(10);
  const [adults, setAdults] = useState<number>(2);
  const [transport, setTransport] = useState<TransportMode>('vip');
  const [includeVisa, setIncludeVisa] = useState<boolean>(true);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);
  const [includeZiarat, setIncludeZiarat] = useState<boolean>(true);

  // Price Calculation Engine
  const estimate = useMemo(() => {
    let basePerDayPerPerson = 60; // Standard

    if (category === 'umrah') {
      if (hotelTier === 'standard') basePerDayPerPerson = 70;
      else if (hotelTier === 'premium') basePerDayPerPerson = 110;
      else if (hotelTier === 'luxury') basePerDayPerPerson = 170; // Clock tower 5-star
    } else if (category === 'domestic') {
      if (hotelTier === 'standard') basePerDayPerPerson = 45;
      else if (hotelTier === 'premium') basePerDayPerPerson = 75;
      else if (hotelTier === 'luxury') basePerDayPerPerson = 120; // Serena / Luxus
    } else { // International
      if (hotelTier === 'standard') basePerDayPerPerson = 80;
      else if (hotelTier === 'premium') basePerDayPerPerson = 130;
      else if (hotelTier === 'luxury') basePerDayPerPerson = 220; // 5-Star Downtown
    }

    let transportTotal = 150; // shared
    if (transport === 'sedan') transportTotal = 350;
    if (transport === 'vip') transportTotal = 650; // GMC / Prado 4x4

    let addOns = 0;
    if (includeVisa) addOns += category === 'umrah' ? 180 * adults : 120 * adults;
    if (includeInsurance) addOns += 35 * adults;
    if (includeZiarat) addOns += 90;

    const accommodationTotal = basePerDayPerPerson * duration * adults;
    const totalUSD = accommodationTotal + transportTotal + addOns;
    const perPersonUSD = Math.round(totalUSD / adults);

    return {
      totalUSD,
      perPersonUSD,
      pkrEstimate: totalUSD * 280, // Approx conversion
    };
  }, [category, hotelTier, duration, adults, transport, includeVisa, includeInsurance, includeZiarat]);

  const handleLockEstimate = () => {
    const categoryName = category === 'umrah' ? 'Executive Umrah' : category === 'domestic' ? 'Northern Pakistan Tour' : 'International Getaway';
    const hotelName = hotelTier === 'luxury' ? '5-Star Luxury VIP' : hotelTier === 'premium' ? '4-Star Premium' : '3-Star Standard';
    const transportName = transport === 'vip' ? 'Private Luxury VIP (GMC/Prado)' : transport === 'sedan' ? 'Private Sedan' : 'Shared AC Coach';
    
    const summary = `${categoryName} (${duration} Days, ${adults} Adults) with ${hotelName} accommodations and ${transportName}. Estimated Total: $${estimate.totalUSD.toLocaleString()}`;
    onBookEstimate(summary, estimate.totalUSD);
  };

  return (
    <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-navy-800 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-overlay filter blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-400/30">
              <Calculator size={14} /> Interactive Cost Estimator
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Customize Your {BRAND_NAME} Journey
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">
              Select your preferred travel parameters to generate real-time pricing and tailored package estimates.
            </p>
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Trip Type */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5">
                1. Trip Category
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'umrah', label: 'Umrah Pilgrimage', icon: Moon },
                  { id: 'domestic', label: 'Domestic Pakistan', icon: Map },
                  { id: 'international', label: 'International', icon: Globe },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id as TripCategory)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-cyan-500 text-navy-900 border-cyan-400 font-bold shadow-lg shadow-cyan-500/20 scale-[1.02]'
                          : 'bg-navy-800/80 text-gray-300 border-navy-700 hover:bg-navy-800 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Hotel Standard */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5">
                2. Hotel Tier & Accommodation
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'luxury', label: '5-Star VIP Luxury', sub: 'Haram Front / 5-Star Suite' },
                  { id: 'premium', label: '4-Star Premium', sub: 'Walking Distance (150m)' },
                  { id: 'standard', label: '3-Star Standard', sub: 'Clean & Comfortable' },
                ].map((item) => {
                  const active = hotelTier === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHotelTier(item.id as HotelTier)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        active
                          ? 'bg-cyan-500 text-navy-900 border-cyan-400 font-bold shadow-lg shadow-cyan-500/20'
                          : 'bg-navy-800/80 text-gray-300 border-navy-700 hover:bg-navy-800'
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${active ? 'text-navy-900/80' : 'text-gray-400'}`}>
                        {item.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Duration and Guests */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Duration: <span className="text-cyan-400">{duration} Days</span>
                  </label>
                </div>
                <input
                  type="range"
                  min="4"
                  max="28"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  aria-label="Trip duration in days"
                  className="w-full accent-cyan-400 cursor-pointer bg-navy-800 rounded-lg h-2"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>4 Days</span>
                  <span>14 Days</span>
                  <span>28 Days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Travelers: <span className="text-cyan-400">{adults} Guests</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAdults(num)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        adults === num
                          ? 'bg-cyan-500 text-navy-900 border-cyan-400'
                          : 'bg-navy-800 text-gray-300 border-navy-700 hover:bg-navy-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Ground Transport */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5">
                4. Ground Transfer Preference
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'vip', label: 'VIP Private GMC/4x4' },
                  { id: 'sedan', label: 'Private Sedan' },
                  { id: 'shared', label: 'Shared AC Coach' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTransport(item.id as TransportMode)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      transport === item.id
                        ? 'bg-cyan-500 text-navy-900 border-cyan-400'
                        : 'bg-navy-800 text-gray-300 border-navy-700 hover:bg-navy-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Inclusions / Addons */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5">
                5. Inclusions & Value Services
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-navy-800/90 border border-navy-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={includeVisa}
                    onChange={(e) => setIncludeVisa(e.target.checked)}
                    className="accent-cyan-400 rounded w-4 h-4"
                  />
                  <span>Visa Processing</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-navy-800/90 border border-navy-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={includeInsurance}
                    onChange={(e) => setIncludeInsurance(e.target.checked)}
                    className="accent-cyan-400 rounded w-4 h-4"
                  />
                  <span>Travel Insurance</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-navy-800/90 border border-navy-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={includeZiarat}
                    onChange={(e) => setIncludeZiarat(e.target.checked)}
                    className="accent-cyan-400 rounded w-4 h-4"
                  />
                  <span>Guided Ziarat / Sightseeing</span>
                </label>
              </div>
            </div>
          </div>

          {/* Real-time Summary & Quote Card */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-br from-navy-800 to-navy-900 border border-navy-700 p-6 sm:p-8 rounded-3xl relative">
            <div>
              <div className="flex items-center justify-between border-b border-navy-700 pb-4 mb-4">
                <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
                  Live Custom Quote
                </span>
                <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> Instant Estimate
                </span>
              </div>

              <div className="space-y-3 mb-6 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Itinerary Type:</span>
                  <strong className="text-white capitalize">{category} ({duration} Days)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Hotel Tier:</span>
                  <strong className="text-white capitalize">{hotelTier} Standard</strong>
                </div>
                <div className="flex justify-between">
                  <span>Number of Guests:</span>
                  <strong className="text-white">{adults} Person(s)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Ground Transport:</span>
                  <strong className="text-white capitalize">{transport} Transfer</strong>
                </div>
                <div className="flex justify-between">
                  <span>Add-ons Included:</span>
                  <strong className="text-cyan-300">
                    {[includeVisa && 'Visa', includeInsurance && 'Insurance', includeZiarat && 'Tours'].filter(Boolean).join(', ') || 'None'}
                  </strong>
                </div>
              </div>

              {/* Price Callout */}
              <div className="bg-navy-900/90 rounded-2xl p-5 border border-navy-700/80 mb-6 text-center">
                <span className="text-[11px] text-gray-400 uppercase tracking-widest block mb-1">
                  Estimated Total Package Price
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white">
                  ${estimate.totalUSD.toLocaleString()} <span className="text-xs font-normal text-gray-400">USD</span>
                </div>
                <div className="text-xs text-cyan-400 font-medium mt-1">
                  (~${estimate.perPersonUSD.toLocaleString()} per person / Rs. {estimate.pkrEstimate.toLocaleString()})
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4 justify-center">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span>Includes 24/7 dedicated {BRAND_NAME} concierge</span>
              </div>

              <button
                type="button"
                onClick={handleLockEstimate}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-navy-900 py-4 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98"
              >
                <span>Lock Estimate & Request Itinerary</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelCalculator;
