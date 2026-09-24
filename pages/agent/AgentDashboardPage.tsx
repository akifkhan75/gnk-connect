import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '../../services/b2b/b2bStore';
import { airDeskAdapter } from '../../services/b2b/airdeskAdapter';
import { pricingEngine } from '../../services/b2b/pricingEngine';
import { StandardGroupProduct, B2BBooking } from '../../types/b2b';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowRight, 
  MapPin, 
  Users, 
  ShieldCheck, 
  AlertTriangle,
  PlaneTakeoff,
  Wallet
} from 'lucide-react';

export const AgentDashboardPage: React.FC = () => {
  const { currentUser, currentAgency, isApprovedAgent } = useB2BAuth();
  const [groups, setGroups] = useState<StandardGroupProduct[]>([]);
  const [bookings, setBookings] = useState<B2BBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productList = await airDeskAdapter.getProducts();
        setGroups(productList.slice(0, 3)); // Featured top 3
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const updateBookings = () => {
      if (currentUser) {
        setBookings(b2bStore.getBookings(currentUser.id));
      }
    };

    fetchData();
    updateBookings();
    return b2bStore.subscribe(updateBookings);
  }, [currentUser]);

  const pendingCount = bookings.filter(b => b.status === 'PENDING_APPROVAL').length;
  const confirmedCount = bookings.filter(b => b.status === 'SUPPLIER_CONFIRMED').length;
  const totalCount = bookings.length;

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                B2B Agent Portal
              </span>
              {isApprovedAgent ? (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={12} /> Active & Verified
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle size={12} /> Pending Verification
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome back, <span className="text-cyan-400">{currentAgency?.name || currentUser?.fullName}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Access real-time group departures, submit passenger bookings, track AirDesk supplier confirmations, and manage your partner margins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/agent/groups"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <PlaneTakeoff size={16} />
              Browse Available Groups
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Requests</span>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{pendingCount}</span>
            <p className="text-xs text-slate-400 mt-1">Awaiting GNK review</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmed Bookings</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{confirmedCount}</span>
            <p className="text-xs text-slate-400 mt-1">Supplier confirmed seats</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Bookings</span>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{totalCount}</span>
            <p className="text-xs text-slate-400 mt-1">Lifetime booking requests</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Wallet / Credit</span>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              PKR {(currentAgency?.walletBalancePKR || 0).toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Credit Limit: PKR {(currentAgency?.creditLimitPKR || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Featured Live Groups from AirDesk */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Calendar className="text-cyan-400" size={20} />
              Featured Group Departures
            </h2>
            <p className="text-xs text-slate-400">Real-time availability and dynamic B2B pricing</p>
          </div>
          <Link
            to="/agent/groups"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            View All Groups <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900 border border-slate-800 rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {groups.map((group) => {
              const earliestDep = group.departures[0];
              const priceResult = earliestDep
                ? pricingEngine.calculatePrice({
                    supplierNetPricePKR: earliestDep.supplierNetPricePKR,
                    supplierId: group.supplierId,
                    product: { id: group.id, supplierProductId: group.supplierProductId, productType: group.productType },
                    agent: currentUser ? { id: currentUser.id, agencyId: currentUser.agencyId } : undefined
                  })
                : null;

              return (
                <div
                  key={group.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group shadow-lg"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={group.heroImage}
                      alt={group.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />
                    
                    <div className="absolute top-3 left-3">
                      <span className="bg-slate-950/80 backdrop-blur-md text-cyan-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-cyan-500/30">
                        {group.productType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1 font-semibold">
                        <MapPin size={13} className="text-cyan-400" /> {group.destination}
                      </span>
                      <span className="bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold">
                        {group.durationDays} Days
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {group.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {group.overview}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Agent Price From</span>
                        <div className="text-lg font-black text-white">
                          PKR {priceResult ? priceResult.calculatedSellingPricePKR.toLocaleString() : 'N/A'}
                        </div>
                        {earliestDep && (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Users size={11} /> {earliestDep.availableSeats} seats left
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/agent/groups/${group.id}`}
                        className="bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-xs font-bold px-3.5 py-2 rounded-lg transition-all border border-slate-700 hover:border-cyan-400"
                      >
                        View & Book →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Bookings Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Layers size={18} className="text-cyan-400" />
              Recent Booking Activities
            </h2>
            <p className="text-xs text-slate-400">Track dual GNK & Supplier references</p>
          </div>
          <Link
            to="/agent/bookings"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
          >
            All Bookings →
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No booking requests yet. Browse available groups to place your first request.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">GNK Booking ID</th>
                  <th className="py-3 px-3">Product / Tour</th>
                  <th className="py-3 px-3">Departure Date</th>
                  <th className="py-3 px-3">Seats</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">AirDesk Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bookings.slice(0, 5).map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">{booking.id}</td>
                    <td className="py-3 px-3 font-semibold text-white max-w-[200px] truncate">{booking.productTitle}</td>
                    <td className="py-3 px-3">{booking.departureDate}</td>
                    <td className="py-3 px-3">{booking.totalSeats} Pax</td>
                    <td className="py-3 px-3 font-bold text-white">PKR {booking.totalAgentSellingPricePKR.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      {booking.status === 'SUPPLIER_CONFIRMED' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                          Confirmed
                        </span>
                      ) : booking.status === 'PENDING_APPROVAL' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
                          Pending Approval
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                          {booking.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {booking.supplierBookingId ? (
                        <span className="text-emerald-400 font-bold">{booking.supplierBookingId}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
