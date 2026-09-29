import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Calendar, Camera, ArrowRight, Star, Bookmark } from 'lucide-react';
import { FEATURED_DESTINATIONS, INTERNATIONAL_DESTINATIONS, BRAND_NAME } from '../constants';
import { motion } from 'framer-motion';
import InquiryModal from '../components/InquiryModal';
import FAQSection from '../components/FAQSection';
import { useCurrency } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';
import { Chips, HeroSearch, PageHero } from '../components/PageHero';

const DestinationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [filterType, setFilterType] = useState<'all' | 'domestic' | 'international'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDestName, setSelectedDestName] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const { formatPrice } = useCurrency();
  const { isSaved, toggleSave } = useWishlist();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const allDestinations = [...FEATURED_DESTINATIONS, ...INTERNATIONAL_DESTINATIONS];

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
    setModalNotes(
      `Booking request for ${destName} (${duration}, starting at ${formatPrice(price)}). Please check flight and hotel availability.`,
    );
    setModalOpen(true);
  };

  return (
    <div className="bg-canvas min-h-screen pb-20">
      {/* Hero Section */}
      <PageHero
        eyebrow={`${BRAND_NAME} destinations`}
        title="Find your next journey"
        subtitle="From the alpine peaks of Skardu and Hunza to the skylines of Dubai and Singapore."
      >
        <HeroSearch
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Skardu, Dubai, Naran, Bali…"
          label="Search destinations"
        />
        <Chips
          className="mt-4"
          value={filterType}
          onChange={setFilterType}
          items={[
            { value: 'all', label: `All (${allDestinations.length})` },
            { value: 'domestic', label: `Pakistan (${FEATURED_DESTINATIONS.length})` },
            {
              value: 'international',
              label: `International (${INTERNATIONAL_DESTINATIONS.length})`,
            },
          ]}
        />
      </PageHero>

      {/* Content Grid */}
      <div className="container mx-auto px-4 md:px-6 py-14">
        {filteredDestinations.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border border-line shadow-sm max-w-lg mx-auto p-8">
            <MapPin className="w-12 h-12 text-cyan-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-ink mb-1">No destinations found</h3>
            <p className="text-xs text-ink-3 mb-6">
              No matches found for "{searchTerm}". Would you like a custom itinerary?
            </p>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="bg-navy-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand hover:text-white transition-colors dark:bg-white dark:text-navy-900"
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
                className="group bg-surface rounded-3xl shadow-lg overflow-hidden border border-line hover:shadow-2xl hover:border-cyan-200 dark:hover:border-cyan-800 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/10 transition-colors"></div>

                    {/* Bookmark Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave({
                          id: dest.id,
                          type: 'destination',
                          title: dest.name,
                          category:
                            dest.type === 'international' ? 'International Tour' : 'Domestic Tour',
                          image: dest.image,
                          price: formatPrice(dest.price),
                        });
                      }}
                      className={`absolute top-4 left-4 p-2 rounded-full backdrop-blur-md transition-all shadow-md ${
                        isSaved(dest.id)
                          ? 'bg-brand text-white'
                          : 'bg-navy-900/60 text-white hover:bg-navy-900'
                      }`}
                      aria-label={
                        isSaved(dest.id) ? `Remove ${dest.name} from saved` : `Save ${dest.name}`
                      }
                    >
                      <Bookmark size={14} className={isSaved(dest.id) ? 'fill-navy-900' : ''} />
                    </button>

                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-navy-900">
                      {dest.type === 'international' ? 'International' : 'Domestic'}
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <Star size={12} className="fill-navy-900 text-ink" />
                        {dest.rating} Rating
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-ink group-hover:text-cyan-600 transition-colors">
                        {dest.name}
                      </h3>
                      <div className="text-right">
                        <span className="block text-lg font-bold text-cyan-600">
                          {formatPrice(dest.price)}
                        </span>
                        <span className="text-[10px] text-gray-400">per person</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-line mb-4 text-center">
                      <div>
                        <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-ink-2 font-medium">{dest.duration}</span>
                      </div>
                      <div className="border-l border-r border-line">
                        <Camera className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-ink-2 font-medium">
                          {dest.activities} Activities
                        </span>
                      </div>
                      <div>
                        <MapPin className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-ink-2 font-medium">{dest.places} Sights</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => handleBookDestination(dest.name, dest.duration, dest.price)}
                    className="w-full bg-brand-soft text-ink py-3 rounded-full font-bold text-sm hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-1.5"
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
