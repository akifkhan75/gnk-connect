import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, 
  Map, 
  Globe, 
  Building2, 
  Calendar, 
  Users, 
  Car, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  Send, 
  Sparkles,
  Clock,
  Compass
} from 'lucide-react';
import { BRAND_NAME } from '../constants';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import InquiryModal from '../components/InquiryModal';

interface PlannerState {
  category: string;
  destinations: string[];
  durationDays: number;
  travelMonth: string;
  pace: string;
  hotelTier: string;
  roomType: string;
  mealPlan: string;
  transportMode: string;
  travelersCount: number;
  addons: string[];
}

const CATEGORIES = [
  {
    id: 'umrah',
    title: 'Executive Umrah Pilgrimage',
    desc: '5-star Haram courtyard suites, GMC ground transfers, and dedicated Ziarat guides.',
    icon: Moon,
    baseCostPerDay: 130,
  },
  {
    id: 'northern',
    title: 'Northern Pakistan Expedition',
    desc: 'Skardu, Hunza Valley, Deosai Plains, and Fairy Meadows luxury stays.',
    icon: Map,
    baseCostPerDay: 85,
  },
  {
    id: 'international',
    title: 'Curated International Holiday',
    desc: 'Dubai, Baku, Istanbul, Thailand, Malaysia, and Europe tours.',
    icon: Globe,
    baseCostPerDay: 160,
  },
  {
    id: 'corporate',
    title: 'Corporate & Group Delegation',
    desc: 'Bespoke corporate retreats, conferences, group flights, and VIP event logistics.',
    icon: Building2,
    baseCostPerDay: 110,
  },
];

const DESTINATION_OPTIONS: Record<string, string[]> = {
  umrah: ['Makkah Al-Mukarramah', 'Madinah Al-Munawwarah', 'Jeddah Historic District', 'Taif Mountain Valley'],
  northern: ['Skardu & Shangrila', 'Hunza & Attabad Lake', 'Swat & Malam Jabba', 'Naran & Kaghan Valley', 'Fairy Meadows & Nanga Parbat'],
  international: ['Dubai & Abu Dhabi (UAE)', 'Baku & Gabala (Azerbaijan)', 'Istanbul & Cappadocia (Turkey)', 'Bangkok & Phuket (Thailand)', 'Kuala Lumpur & Langkawi (Malaysia)'],
  corporate: ['Islamabad Executive Stays', 'Bhurban & Murree Resorts', 'Dubai Marina Conference Suites', 'Baku Convention Venues'],
};

const HOTEL_TIERS = [
  { id: '5star_vip', name: '5-Star Ultra Luxury (Haram/Front View)', multiplier: 1.6, desc: 'Clock Tower / Serena / 5-Star International chains' },
  { id: '5star_std', name: '5-Star Standard (Walking Distance)', multiplier: 1.3, desc: 'Premium verified 5-star properties with breakfast buffet' },
  { id: '4star_prem', name: '4-Star Premium', multiplier: 1.0, desc: 'Comfortable 4-star boutique accommodation' },
  { id: '3star_eco', name: '3-Star Standard (Budget Friendly)', multiplier: 0.75, desc: 'Clean, verified budget-friendly rooms' },
];

const TRANSPORT_MODES = [
  { id: 'gmc_vip', name: 'Private GMC Suburban VIP', extraPerDay: 60, desc: 'Dedicated chauffeur-driven luxury SUV' },
  { id: 'sedan', name: 'Private Executive Sedan (Camry/Civic)', extraPerDay: 35, desc: 'Private air-conditioned car for 1-3 passengers' },
  { id: 'van_coaster', name: 'Private Luxury Van / Coaster (Hiace)', extraPerDay: 50, desc: 'Ideal for families & groups up to 12 persons' },
  { id: 'shared', name: 'Shared High-Speed Train / Luxury Bus', extraPerDay: 15, desc: 'Haramain high-speed train or luxury coach transfers' },
];

const ADDONS_LIST = [
  { id: 'visa_fast', name: 'Fast-Track Sticker / E-Visa Processing', cost: 120 },
  { id: 'insurance', name: 'Comprehensive Travel & Medical Insurance', cost: 35 },
  { id: 'guide', name: 'Dedicated Multilingual Local Tour Guide', cost: 80 },
  { id: 'airport_vip', name: 'Airport VIP CIP Lounge & Fast-Track Meet & Greet', cost: 65 },
  { id: 'ziarat_private', name: 'Private Sacred Historical Ziarat Excursion', cost: 50 },
  { id: 'sim_data', name: 'Local 5G SIM Cards with Unlimited Data', cost: 20 },
];

const TripPlannerPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const [planner, setPlanner] = useState<PlannerState>({
    category: 'umrah',
    destinations: ['Makkah Al-Mukarramah', 'Madinah Al-Munawwarah'],
    durationDays: 10,
    travelMonth: 'Next 30 Days',
    pace: 'Balanced',
    hotelTier: '5star_vip',
    roomType: 'Double Sharing (2 Beds)',
    mealPlan: 'Breakfast Buffet Included',
    transportMode: 'gmc_vip',
    travelersCount: 2,
    addons: ['visa_fast', 'insurance', 'airport_vip'],
  });

  const selectedCategoryObj = CATEGORIES.find(c => c.id === planner.category) || CATEGORIES[0];
  const selectedHotelObj = HOTEL_TIERS.find(h => h.id === planner.hotelTier) || HOTEL_TIERS[0];
  const selectedTransportObj = TRANSPORT_MODES.find(t => t.id === planner.transportMode) || TRANSPORT_MODES[0];

  // Calculate estimated price per person in USD
  const baseRate = selectedCategoryObj.baseCostPerDay * selectedHotelObj.multiplier;
  const transportRate = selectedTransportObj.extraPerDay / Math.max(1, planner.travelersCount);
  const dailyRatePerPerson = baseRate + transportRate;
  const hotelAndTransportTotal = dailyRatePerPerson * planner.durationDays;

  const addonsTotal = planner.addons.reduce((acc, addonId) => {
    const item = ADDONS_LIST.find(a => a.id === addonId);
    return acc + (item ? item.cost : 0);
  }, 0);

  const totalPerPersonUSD = Math.round(hotelAndTransportTotal + addonsTotal);
  const totalGroupUSD = totalPerPersonUSD * planner.travelersCount;

  const toggleDestination = (dest: string) => {
    setPlanner(prev => {
      const exists = prev.destinations.includes(dest);
      if (exists) {
        if (prev.destinations.length === 1) return prev; // At least one destination required
        return { ...prev, destinations: prev.destinations.filter(d => d !== dest) };
      } else {
        return { ...prev, destinations: [...prev.destinations, dest] };
      }
    });
  };

  const toggleAddon = (addonId: string) => {
    setPlanner(prev => {
      const exists = prev.addons.includes(addonId);
      return {
        ...prev,
        addons: exists ? prev.addons.filter(a => a !== addonId) : [...prev.addons, addonId]
      };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenInquiry = () => {
    setModalOpen(true);
    showToast('Itinerary Prepared', 'Please enter your contact details to receive full quotation.', 'info');
  };

  const getSummaryNotes = () => {
    return `Bespoke Itinerary Plan:
- Category: ${selectedCategoryObj.title}
- Destinations: ${planner.destinations.join(', ')}
- Duration: ${planner.durationDays} Days (Pace: ${planner.pace})
- Departure Window: ${planner.travelMonth}
- Hotel Preference: ${selectedHotelObj.name}
- Room & Meal: ${planner.roomType} (${planner.mealPlan})
- Ground Transport: ${selectedTransportObj.name}
- Number of Travelers: ${planner.travelersCount}
- Selected Add-ons: ${planner.addons.map(a => ADDONS_LIST.find(item => item.id === a)?.name).filter(Boolean).join(', ')}
- Estimated Cost: ${formatPrice(totalPerPersonUSD)} / person (Group Total: ${formatPrice(totalGroupUSD)})`;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header Banner */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden print:hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3 border border-cyan-400/30">
            <Compass size={14} className="animate-spin-slow" /> {BRAND_NAME} Itinerary Builder
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-white tracking-tight">
            Build Your Dream Itinerary
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
            Customize every leg of your sacred Umrah pilgrimage, northern expedition, or international holiday with instant transparent pricing.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20 max-w-5xl">
        {/* Step Progress Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-gray-100 mb-8 print:hidden">
          <div className="flex justify-between items-center relative">
            <div className="hidden sm:block absolute top-1/2 left-8 right-8 h-1 bg-gray-100 -translate-y-1/2 z-0">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              />
            </div>

            {[
              { num: 1, title: 'Category' },
              { num: 2, title: 'Destinations' },
              { num: 3, title: 'Hotels' },
              { num: 4, title: 'Transport & Extras' },
              { num: 5, title: 'Review & Estimate' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`relative z-10 flex flex-col items-center gap-1 group transition-all`}
              >
                <div 
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-md ${
                    currentStep === s.num
                      ? 'bg-cyan-500 text-navy-900 ring-4 ring-cyan-500/20 scale-110'
                      : currentStep > s.num
                      ? 'bg-navy-900 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {currentStep > s.num ? <Check size={16} /> : s.num}
                </div>
                <span className={`text-[10px] sm:text-xs font-bold ${
                  currentStep === s.num ? 'text-navy-900' : 'text-gray-400'
                }`}>
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Wizard Main Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-gray-100">
          <AnimatePresence mode="wait">
            {/* STEP 1: CATEGORY */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1">Select Travel Experience</h2>
                  <p className="text-xs text-gray-500">Choose the type of journey you wish to orchestrate.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = planner.category === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          setPlanner(prev => ({
                            ...prev,
                            category: cat.id,
                            destinations: DESTINATION_OPTIONS[cat.id]?.slice(0, 2) || []
                          }));
                        }}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-50/40 shadow-xl'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3.5 rounded-2xl ${isSelected ? 'bg-cyan-500 text-navy-900' : 'bg-navy-50 text-navy-900'}`}>
                            <Icon size={24} />
                          </div>
                          {isSelected && (
                            <span className="bg-cyan-500 text-navy-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-navy-900 text-base mb-1.5">{cat.title}</h3>
                          <p className="text-gray-600 text-xs leading-relaxed">{cat.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: DESTINATIONS & SCHEDULE */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1">Destinations & Schedule</h2>
                  <p className="text-xs text-gray-500">Pick locations to include and set your preferred duration.</p>
                </div>

                {/* Destination Chips */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Included Destinations / Stops
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(DESTINATION_OPTIONS[planner.category] || []).map((dest) => {
                      const isChecked = planner.destinations.includes(dest);
                      return (
                        <div
                          key={dest}
                          onClick={() => toggleDestination(dest)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-navy-900 text-white border-navy-900 shadow-md'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <span className="text-xs font-bold">{dest}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-cyan-400 text-navy-900 font-bold' : 'border border-gray-300'
                          }`}>
                            {isChecked && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Duration Slider & Month */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Trip Duration
                      </label>
                      <span className="text-sm font-extrabold text-cyan-600 bg-cyan-50 px-3 py-0.5 rounded-full">
                        {planner.durationDays} Days ({planner.durationDays - 1} Nights)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={30}
                      step={1}
                      value={planner.durationDays}
                      onChange={(e) => setPlanner({ ...planner, durationDays: Number(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                      <span>4 Days</span>
                      <span>15 Days</span>
                      <span>30 Days</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Departure Window
                    </label>
                    <select
                      value={planner.travelMonth}
                      onChange={(e) => setPlanner({ ...planner, travelMonth: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      <option value="Immediate / Next 15 Days">Immediate (Next 15 Days)</option>
                      <option value="Next 30 Days">Next 30 Days</option>
                      <option value="Ramadan 2025">Ramadan Season 2025</option>
                      <option value="Summer 2025 (June - Aug)">Summer 2025 (June - Aug)</option>
                      <option value="Autumn / Winter 2025">Autumn / Winter 2025</option>
                      <option value="Flexible Dates">Flexible Dates</option>
                    </select>
                  </div>
                </div>

                {/* Travelers Count & Pace */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Number of Travelers
                    </label>
                    <div className="flex items-center gap-3">
                      {[1, 2, 4, 6, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPlanner({ ...planner, travelersCount: num })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            planner.travelersCount === num
                              ? 'bg-cyan-500 text-navy-900 border-cyan-500 shadow-md'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {num} {num === 1 ? 'Pax' : 'Pax'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Itinerary Pace
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Relaxed', 'Balanced', 'Fast-Paced'].map((pace) => (
                        <button
                          key={pace}
                          type="button"
                          onClick={() => setPlanner({ ...planner, pace })}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            planner.pace === pace
                              ? 'bg-navy-900 text-white border-navy-900'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {pace}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: HOTELS & ACCOMMODATION */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1">Accommodation Preferences</h2>
                  <p className="text-xs text-gray-500">Select luxury rating, room format, and meal plans.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Hotel Class & Proximity
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {HOTEL_TIERS.map((tier) => {
                      const isSelected = planner.hotelTier === tier.id;
                      return (
                        <div
                          key={tier.id}
                          onClick={() => setPlanner({ ...planner, hotelTier: tier.id })}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-50/40 shadow-lg'
                              : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-navy-900 text-sm">{tier.name}</h4>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-cyan-500 text-navy-900 flex items-center justify-center">
                                <Check size={10} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{tier.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Room Configuration
                    </label>
                    <select
                      value={planner.roomType}
                      onChange={(e) => setPlanner({ ...planner, roomType: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      <option value="Single Private Room">Single Private Room (1 King Bed)</option>
                      <option value="Double Sharing (2 Beds)">Double Room (2 Twin / 1 King Bed)</option>
                      <option value="Triple Family Room">Triple Room (3 Beds)</option>
                      <option value="Quad Sharing Room">Quad Room (4 Beds - Economy)</option>
                      <option value="Executive Suite with Haram View">Executive Suite (Living Room + View)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Meal Plan
                    </label>
                    <select
                      value={planner.mealPlan}
                      onChange={(e) => setPlanner({ ...planner, mealPlan: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      <option value="Breakfast Buffet Included">Breakfast Buffet Included</option>
                      <option value="Half Board (Breakfast + Dinner)">Half Board (Breakfast + Dinner)</option>
                      <option value="Full Board (All 3 Meals Included)">Full Board (Breakfast + Lunch + Dinner)</option>
                      <option value="Room Only (No Meals)">Room Only (Flexible Dining)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: TRANSPORT & ADD-ONS */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1">Ground Transport & Add-ons</h2>
                  <p className="text-xs text-gray-500">Pick VIP transfers and additional travel conveniences.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Ground Transfer Vehicle
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {TRANSPORT_MODES.map((t) => {
                      const isSelected = planner.transportMode === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setPlanner({ ...planner, transportMode: t.id })}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-50/40 shadow-lg'
                              : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-navy-900 text-sm flex items-center gap-1.5">
                              <Car size={16} className="text-cyan-600" />
                              <span>{t.name}</span>
                            </h4>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-cyan-500 text-navy-900 flex items-center justify-center">
                                <Check size={10} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Optional VIP Add-ons & Travel Protections
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ADDONS_LIST.map((addon) => {
                      const isChecked = planner.addons.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-navy-900 text-white border-navy-900 shadow-md'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                              isChecked ? 'bg-cyan-400 text-navy-900 font-bold' : 'border border-gray-300'
                            }`}>
                              {isChecked && <Check size={12} />}
                            </div>
                            <span className="text-xs font-bold">{addon.name}</span>
                          </div>
                          <span className={`text-[11px] font-extrabold ${isChecked ? 'text-cyan-300' : 'text-gray-500'}`}>
                            +{formatPrice(addon.cost)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REVIEW & INSTANT ESTIMATE */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1">Your Custom Itinerary Summary</h2>
                    <p className="text-xs text-gray-500">Review your customized travel blueprint and projected budget.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-navy-900 font-bold text-xs transition-colors print:hidden"
                  >
                    <Printer size={14} />
                    <span>Print / Save as PDF</span>
                  </button>
                </div>

                {/* Detailed Summary Card */}
                <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-navy-800">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-navy-800 gap-4">
                    <div>
                      <span className="text-cyan-400 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                        {selectedCategoryObj.title}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold">{planner.destinations.join(' ➔ ')}</h3>
                      <p className="text-xs text-gray-300 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {planner.durationDays} Days</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {planner.travelersCount} Travelers</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {planner.travelMonth}</span>
                      </p>
                    </div>

                    <div className="text-left md:text-right bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
                      <span className="text-[10px] uppercase font-bold text-gray-300 block">Projected Total</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 block">
                        {formatPrice(totalPerPersonUSD)}
                      </span>
                      <span className="text-[10px] text-gray-300">
                        per person (Group Total: {formatPrice(totalGroupUSD)})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6 border-b border-navy-800 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold uppercase block mb-1">Hotel Category</span>
                      <p className="font-semibold text-white">{selectedHotelObj.name}</p>
                      <p className="text-gray-400 text-[11px]">{planner.roomType} • {planner.mealPlan}</p>
                    </div>

                    <div>
                      <span className="text-gray-400 font-bold uppercase block mb-1">Ground Transport</span>
                      <p className="font-semibold text-white">{selectedTransportObj.name}</p>
                      <p className="text-gray-400 text-[11px]">Pace: {planner.pace}</p>
                    </div>

                    <div>
                      <span className="text-gray-400 font-bold uppercase block mb-1">Selected Add-ons</span>
                      <p className="font-semibold text-white">
                        {planner.addons.length === 0 ? 'None selected' : `${planner.addons.length} VIP Extras Included`}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] text-gray-300 text-center sm:text-left">
                      🛡️ Includes GNK Connect 24/7 on-ground concierge support and IATA ticketing protection.
                    </p>

                    <button
                      type="button"
                      onClick={handleOpenInquiry}
                      className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-extrabold px-8 py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      <span>Lock In Custom Quotation</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons Footer */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8 print:hidden">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-7 py-2.5 rounded-xl bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenInquiry}
                className="px-8 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles size={16} />
                <span>Request Formal Quotation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <InquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageName={`Custom ${selectedCategoryObj.title}`}
        initialNotes={getSummaryNotes()}
      />
    </div>
  );
};

export default TripPlannerPage;
