import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { airDeskAdapter } from '../../services/b2b/airdeskAdapter';
import { pricingEngine } from '../../services/b2b/pricingEngine';
import { StandardGroupProduct } from '../../types/b2b';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Check, 
  ArrowRight 
} from 'lucide-react';

export const AgentGroupsPage: React.FC = () => {
  const { currentUser } = useB2BAuth();
  const [products, setProducts] = useState<StandardGroupProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StandardGroupProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const list = await airDeskAdapter.getProducts();
        setProducts(list);
        setFilteredProducts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    let list = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.destination.toLowerCase().includes(q) || 
        p.country.toLowerCase().includes(q)
      );
    }

    if (selectedType !== 'ALL') {
      list = list.filter(p => p.productType === selectedType);
    }

    setFilteredProducts(list);
  }, [searchQuery, selectedType, products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="text-cyan-400" size={24} />
            Available Group Departures
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Direct inventory powered by AirDesk Groups engine with real-time seat availability & B2B margins
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Supplier Live: <strong>AirDesk API</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search destination, city, or tour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Type Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'All Departures', value: 'ALL' },
            { label: 'Group Tours', value: 'GROUP_TOUR' },
            { label: 'Umrah Packages', value: 'UMRAH' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedType(tab.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedType === tab.value
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl h-96 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-sm">No group departures found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const earliestDep = product.departures[0];
            const priceResult = earliestDep ? pricingEngine.calculatePrice({
              supplierNetPricePKR: earliestDep.supplierNetPricePKR,
              supplierId: product.supplierId,
              product: { id: product.id, supplierProductId: product.supplierProductId, productType: product.productType },
              agent: currentUser ? { id: currentUser.id, agencyId: currentUser.agencyId } : undefined
            }) : null;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between shadow-xl group"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={product.heroImage}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/50" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="bg-slate-950/90 backdrop-blur-md text-cyan-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-cyan-500/30">
                        {product.productType.replace('_', ' ')}
                      </span>
                      <span className="bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                        {product.supplierProductId}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1 font-bold">
                        <MapPin size={13} className="text-cyan-400" /> {product.destination}
                      </span>
                      <span className="bg-slate-900/90 text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        {product.durationDays}D / {product.durationNights}N
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {product.overview}
                    </p>

                    {/* Inclusions summary */}
                    <div className="space-y-1 pt-1">
                      {product.inclusions.slice(0, 2).map((inc, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <Check size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="truncate">{inc}</span>
                        </div>
                      ))}
                    </div>

                    {/* Next Departures preview */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Available Departures
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {product.departures.map(d => (
                          <span
                            key={d.id}
                            className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold ${
                              d.availableSeats <= 5
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {d.departureDate.slice(5)} ({d.availableSeats} seats)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Agent Net Selling</span>
                      <div className="text-base font-black text-white">
                        PKR {priceResult ? priceResult.calculatedSellingPricePKR.toLocaleString() : 'N/A'}
                        <span className="text-[10px] text-slate-400 font-normal"> / seat</span>
                      </div>
                    </div>

                    <Link
                      to={`/agent/groups/${product.id}`}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-cyan-500/10 flex items-center gap-1.5"
                    >
                      Book Group <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
