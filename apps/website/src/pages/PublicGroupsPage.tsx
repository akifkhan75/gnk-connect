import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { airDeskAdapter } from '@gnk/suppliers';
import { StandardGroupProduct } from '@gnk/types';
import { 
  MapPin, 
  Check, 
  Sparkles, 
  Search, 
  Eye 
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { PublicGroupBookingModal } from '../components/PublicGroupBookingModal';

export const PublicGroupsPage: React.FC = () => {
  const [products, setProducts] = useState<StandardGroupProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<StandardGroupProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await airDeskAdapter.getProducts();
        setProducts(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleOpenBooking = (product: StandardGroupProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter((p) => {
    if (activeCategory !== 'ALL') {
      if (activeCategory === 'DUBAI' && !p.destination.toLowerCase().includes('dubai')) return false;
      if (activeCategory === 'UMRAH' && !p.title.toLowerCase().includes('umrah') && !p.destination.toLowerCase().includes('saudi')) return false;
      if (activeCategory === 'TURKEY' && !p.destination.toLowerCase().includes('turkey') && !p.title.toLowerCase().includes('turkey')) return false;
      if (activeCategory === 'MALAYSIA' && !p.destination.toLowerCase().includes('malaysia')) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q) ||
        p.overview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="pt-24 pb-20 bg-slate-950 text-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} /> Guaranteed AirDesk Group Departures
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
            Curated International <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Group Tours</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Experience premium worldwide group travel with guaranteed flight blocks, 4 & 5-star hotel accommodations, expert multilingual tour guides, and seamless visa clearance.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search group departures, cities, hotels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { label: 'All Departures', value: 'ALL' },
              { label: 'Dubai (UAE)', value: 'DUBAI' },
              { label: 'Saudi Umrah', value: 'UMRAH' },
              { label: 'Turkey & Europe', value: 'TURKEY' },
              { label: 'Malaysia & Asia', value: 'MALAYSIA' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === tab.value
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* B2B Partner Callout Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
              For Travel Agencies & Independent Resellers
            </span>
            <h3 className="text-xl font-black text-white">Looking for Wholesale B2B Rates?</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Access wholesale group inventory directly with custom margins, 1-click supplier pushing, and live statement of account on the GNK Connect B2B Portal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/agent/login"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 whitespace-nowrap"
            >
              Partner Portal Login →
            </Link>
            <Link
              to="/agent/register"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-xl text-xs border border-slate-700 whitespace-nowrap"
            >
              Register Agency
            </Link>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-slate-900 border border-slate-800 rounded-3xl h-96 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2 bg-slate-900 border border-slate-800 rounded-3xl">
            <p className="text-lg font-bold text-white">No matching group departures found</p>
            <p className="text-xs text-slate-500">Try clearing your search query or selecting another destination filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((p) => {
              const earliestDep = p.departures[0];
              const retailPricePKR = earliestDep ? earliestDep.supplierNetPricePKR + 15000 : 200000;

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-xl hover:shadow-cyan-500/10"
                >
                  <div>
                    {/* Hero Thumbnail */}
                    <div className="relative h-60 overflow-hidden">
                      <img
                        src={p.heroImage}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />

                      <div className="absolute top-4 left-4">
                        <span className="bg-slate-950/90 backdrop-blur-md text-cyan-400 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-cyan-500/30">
                          {p.productType.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-cyan-400" /> {p.destination}
                        </span>
                        <span className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
                          {p.durationDays} Days / {p.durationNights} Nights
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      <h3 className="font-bold text-white text-lg group-hover:text-cyan-400 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.overview}</p>

                      {/* Inclusions preview */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        {p.inclusions.slice(0, 3).map((inc, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                            <Check size={13} className="text-cyan-400 flex-shrink-0" />
                            <span className="truncate">{inc}</span>
                          </div>
                        ))}
                      </div>

                      {/* Departures */}
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Upcoming Fixed Departures
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {p.departures.map(d => (
                            <span key={d.id} className="text-[11px] font-mono bg-slate-950 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-800">
                              {d.departureDate} ({d.availableSeats} seats left)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-6 pt-0 space-y-2">
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Starting From</span>
                        <div className="text-lg font-black text-white">
                          {formatPrice(retailPricePKR)}
                          <span className="text-[10px] text-slate-400 font-normal"> / person</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenBooking(p)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                      >
                        <Eye size={13} /> View & Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Public Group Booking & Traveler Inquiry Modal */}
      <PublicGroupBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};

export default PublicGroupsPage;
