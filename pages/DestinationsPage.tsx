import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Calendar, Camera, Search, ArrowRight, Star } from 'lucide-react';
import { FEATURED_DESTINATIONS, INTERNATIONAL_DESTINATIONS, BRAND_NAME } from '../constants';
import { motion } from 'framer-motion';
import InquiryModal from '../components/InquiryModal';
import FAQSection from '../components/FAQSection';
import { useCurrency } from '../context/CurrencyContext';

const DestinationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [filterType, setFilterType] = useState<'all' | 'domestic' | 'international'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDestName, setSelectedDestName] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const allDestinations = [
    ...FEATURED_DESTINATIONS,
    ...INTERNATIONAL_DESTINATIONS
  ];

  const filteredDestinations = allDestinations.filter((dest) => {
    const matchesSearch = dest.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || dest.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  const handleBookDestination = (destName: string, duration: string, price: string) => {
    setSelectedDestName(`${destName} Tour Package`);
    setModalNotes(`Booking request for ${destName} (${duration}, starting at ${formatPrice(price)}). Please check flight and hotel availability.`);
    setModalOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Section */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-2 block animate-pulse">
            {BRAND_NAME} Destinations
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white tracking-tight">
            Find Your Next Journey
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto font-light mb-8">
            From the high alpine peaks of Skardu and Hunza to the futuristic skylines of Dubai and Singapore.
          </p>

          {/* Search Bar & Filters */}
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            <div className="flex gap-2 bg-white/10 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-white/20">
              <div className="flex-1 flex items-center px-4">
                <Search className="text-gray-300 mr-2.5 shrink-0" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Filter destinations (e.g. Skardu, Dubai, Naran, Bali)..." 
                  aria-label="Search destination listings"
                  className="w-full bg-transparent outline-none text-white placeholder-gray-300 text-sm"
                />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="text-xs text-gray-300 hover:text-white px-3"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-cyan-500 text-navy-900 shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                All Destinations ({allDestinations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('domestic')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterType === 'domestic'
                    ? 'bg-cyan-500 text-navy-900 shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Domestic Pakistan ({FEATURED_DESTINATIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('international')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterType === 'international'
                    ? 'bg-cyan-500 text-navy-900 shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                International ({INTERNATIONAL_DESTINATIONS.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="container mx-auto px-4 md:px-6 py-14">
        {filteredDestinations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm max-w-lg mx-auto p-8">
            <MapPin className="w-12 h-12 text-cyan-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-navy-900 mb-1">No destinations found</h3>
            <p className="text-xs text-gray-500 mb-6">No matches found for "{searchTerm}". Would you like a custom itinerary?</p>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="bg-navy-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-navy-900 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDestinations.map((dest, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={dest.id} 
                className="group bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={dest.image} 
                      alt={dest.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/10 transition-colors"></div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-navy-900 uppercase tracking-wider">
                      {dest.type === 'international' ? 'International' : 'Domestic'}
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-cyan-500 text-navy-900 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <Star size={12} className="fill-navy-900 text-navy-900" />
                        {dest.rating} Rating
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-navy-900 group-hover:text-cyan-600 transition-colors">
                        {dest.name}
                      </h3>
                      <div className="text-right">
                        <span className="block text-lg font-extrabold text-cyan-600">
                          {formatPrice(dest.price)}
                        </span>
                        <span className="text-[10px] text-gray-400">per person</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-gray-100 mb-4 text-center">
                      <div>
                        <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-600 font-medium">{dest.duration}</span>
                      </div>
                      <div className="border-l border-r border-gray-100">
                        <Camera className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-600 font-medium">{dest.activities} Activities</span>
                      </div>
                      <div>
                        <MapPin className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-600 font-medium">{dest.places} Sights</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button 
                    type="button"
                    onClick={() => handleBookDestination(dest.name, dest.duration, dest.price)}
                    className="w-full bg-navy-50 text-navy-900 py-3 rounded-xl font-bold text-xs hover:bg-cyan-500 hover:text-navy-900 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Check Availability & Book</span> <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Global FAQ Section */}
      <FAQSection />

      <InquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageName={selectedDestName}
        initialNotes={modalNotes}
      />
    </div>
  );
};

export default DestinationsPage;