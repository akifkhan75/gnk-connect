import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '@gnk/api-client';
import { airDeskAdapter } from '@gnk/suppliers';
import { pricingEngine } from '@gnk/api-client';
import { StandardGroupProduct, B2BBooking } from '@gnk/types';
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  MapPin, 
  Users, 
  ShieldCheck, 
  AlertTriangle,
  PlaneTakeoff,
  Wallet,
  CreditCard,
  Phone,
  MessageCircle,
  ChevronRight,
  TrendingUp,
  Ticket
} from 'lucide-react';

export const AgentDashboardPage: React.FC = () => {
  const { 
    currentUser, 
    currentAgency, 
    isApprovedAgent, 
    canViewFinances 
  } = useB2BAuth();

  const [groups, setGroups] = useState<StandardGroupProduct[]>([]);
  const [bookings, setBookings] = useState<B2BBooking[]>([]);

  // Quick Filter
  const [selectedDestination, setSelectedDestination] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productList = await airDeskAdapter.getProducts();
        setGroups(productList);
      } catch (err) {
        console.error(err);
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

  // Derived Financial KPIs
  const totalWalletBalance = currentAgency?.walletBalancePKR || 0;
  const totalCreditLimit = currentAgency?.creditLimitPKR || 0;
  const availableSpendingPower = totalWalletBalance + totalCreditLimit;

  const confirmedBookings = bookings.filter(b => b.status === 'SUPPLIER_CONFIRMED');
  const pendingBookings = bookings.filter(b => b.status === 'PENDING_APPROVAL' || b.status === 'APPROVED');
  const totalSeatsSold = confirmedBookings.reduce((sum, b) => sum + b.totalSeats, 0);
  const totalMarkupEarned = confirmedBookings.reduce((sum, b) => sum + (b.totalMarkupPKR || 0), 0);

  const filteredGroups = selectedDestination === 'ALL'
    ? groups
    : groups.filter(g => g.destination.toLowerCase().includes(selectedDestination.toLowerCase()) || g.country.toLowerCase().includes(selectedDestination.toLowerCase()));

  return (
    <div className="space-y-7">
      {/* 1. TOP AIRDESK WELCOME & OPERATIONS COMMAND BAR */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/80 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-black tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-0.5 rounded-full">
                AirDesk Partner Terminal
              </span>
              
              {isApprovedAgent ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-full">
                  <ShieldCheck size={13} /> Verified B2B Partner
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 rounded-full">
                  <AlertTriangle size={13} /> Account Under Review
                </span>
              )}

              {currentAgency?.tradeLicenseNumber && (
                <span className="text-xs text-slate-400 bg-slate-950/80 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono">
                  DTS: {currentAgency.tradeLicenseNumber}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {currentAgency?.name || currentUser?.fullName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Wholesale group departures, real-time seat inventory, and automated dual-ID PNR ticket dispatch powered by AirDesk Groups Engine.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/agent/groups"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 text-center"
            >
              <PlaneTakeoff size={16} />
              <span>Explore Group Series</span>
            </Link>
            {canViewFinances && (
              <Link
                to="/agent/ledger"
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold px-4 py-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 text-center"
              >
                <Wallet size={15} className="text-emerald-400" />
                <span>Statement of Account</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. AIRDESK 5-METRIC KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Available Spending Float */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Float</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet size={15} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-emerald-400">
            PKR {canViewFinances ? availableSpendingPower.toLocaleString() : '••••••••'}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Prepaid: PKR {canViewFinances ? totalWalletBalance.toLocaleString() : '•••'}</span>
            <span className="text-emerald-400 font-bold">Instant Hold</span>
          </div>
        </div>

        {/* Credit Limit & Utilization */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Trade Credit Line</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CreditCard size={15} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-white">
            PKR {canViewFinances ? totalCreditLimit.toLocaleString() : '••••••••'}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Utilization: 0%</span>
            <span className="text-cyan-400 font-bold">Approved Line</span>
          </div>
        </div>

        {/* Confirmed Seats */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed Seats</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Users size={15} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-purple-400">
            {totalSeatsSold} <span className="text-xs text-slate-400 font-normal">Passengers</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{confirmedBookings.length} bookings confirmed</span>
            <span className="text-purple-400 font-bold">AirDesk PNRs</span>
          </div>
        </div>

        {/* Pending Operations */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Bookings</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-amber-400">
            {bookings.length} <span className="text-xs text-slate-400 font-normal">Total</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{pendingBookings.length} pending review</span>
            <span className="text-amber-400 font-bold">In Progress</span>
          </div>
        </div>

        {/* Retained Partner Margins */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Retained Margin</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-cyan-400">
            PKR {canViewFinances ? totalMarkupEarned.toLocaleString() : '••••••••'}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Agency Margin</span>
            <span className="text-cyan-400 font-bold">Audited Profit</span>
          </div>
        </div>

      </div>

      {/* 3. AIRDESK LIVE GROUP SERIES INVENTORY MATRIX */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">AirDesk Live Group Departures</h2>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Direct GDS
              </span>
            </div>
            <p className="text-xs text-slate-400">Wholesale group series with guaranteed seat allocations and instant booking</p>
          </div>

          {/* Destination Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'Dubai', 'Saudi', 'Turkey', 'Baku'].map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => setSelectedDestination(dest)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedDestination === dest
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {dest === 'ALL' ? 'All Departures' : dest}
              </button>
            ))}
          </div>
        </div>

        {/* Group Departure Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.slice(0, 3).map((product) => {
            const nextDeparture = product.departures[0];
            const priceCalc = pricingEngine.calculatePrice({
              supplierNetPricePKR: nextDeparture?.supplierNetPricePKR || 180000,
              supplierId: product.supplierId,
              product: { id: product.id, supplierProductId: product.supplierProductId, productType: product.productType },
              agent: { id: currentUser?.id || 'demo-agent', agencyId: currentUser?.agencyId }
            });

            return (
              <div
                key={product.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Image & Badges */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={product.heroImage}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40"></div>

                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="bg-slate-950/80 backdrop-blur-md text-cyan-400 border border-cyan-500/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {product.supplierProductId}
                    </span>
                    {product.airline && (
                      <span className="bg-slate-950/80 backdrop-blur-md text-white border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-full">
                        ✈ {product.airline.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase shadow-md">
                      {nextDeparture?.availableSeats || 8} Seats Left
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin size={13} className="text-cyan-400" /> {product.destination}, {product.country}
                    </span>
                    <span className="text-[11px] text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded-md">
                      {product.durationDays}D / {product.durationNights}N
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {product.overview}
                    </p>
                  </div>

                  {/* Departure & Pricing Matrix */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar size={12} className="text-cyan-400" /> Next Departure:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {nextDeparture?.departureDate || '2026-10-15'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Selling Price / Seat</div>
                        <div className="text-sm font-mono font-black text-cyan-400">
                          PKR {priceCalc.calculatedSellingPricePKR.toLocaleString()}
                        </div>
                      </div>

                    </div>
                  </div>

                  <Link
                    to={`/agent/groups/${product.id}`}
                    className="w-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 group-hover:bg-cyan-500 group-hover:text-slate-950"
                  >
                    <span>Reserve & Book Seats</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. RECENT BOOKINGS & DUAL-ID PNR STREAM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Dual-ID Bookings</h2>
            <p className="text-xs text-slate-400">Real-time status tracking between GNK Reference and AirDesk PNR</p>
          </div>
          <Link to="/agent/bookings" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
            View All Bookings <ChevronRight size={13} />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Bookings Submitted Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Select a group series above to allocate seats and generate your first AirDesk PNR with wholesale pricing.
            </p>
            <Link
              to="/agent/groups"
              className="inline-flex items-center gap-2 bg-cyan-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold"
            >
              Browse Available Groups
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Booking Identifiers</th>
                    <th className="py-3.5 px-4">Group Tour</th>
                    <th className="py-3.5 px-4">Departure</th>
                    <th className="py-3.5 px-4">Seats</th>
                    <th className="py-3.5 px-4">Total Selling Price</th>
                    <th className="py-3.5 px-4">AirDesk Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {bookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white">{b.id}</div>
                        {b.supplierBookingId ? (
                          <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-1">
                            <span>PNR:</span> {b.supplierBookingId}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">PNR: Pending Push</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-white max-w-[200px] truncate">
                        {b.productTitle}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {b.departureDate}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        {b.totalSeats} {b.totalSeats === 1 ? 'Seat' : 'Seats'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        PKR {b.totalAgentSellingPricePKR?.toLocaleString() || 'N/A'}
                      </td>

                      <td className="py-3.5 px-4">
                        {b.status === 'SUPPLIER_CONFIRMED' && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Confirmed
                          </span>
                        )}
                        {b.status === 'PENDING_APPROVAL' && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pending Review
                          </span>
                        )}
                        {b.status === 'SUBMITTED_TO_SUPPLIER' && (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            AirDesk Processing
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to="/agent/bookings"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-cyan-500/40"
                        >
                          Details <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. AIRDESK OPERATIONS HELPLINE & BANK WIRE DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support Hotline */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Phone size={18} />
            <h3 className="text-sm font-bold text-white">Priority Operations Desk</h3>
          </div>
          <p className="text-xs text-slate-400">
            Direct airline seat hold escalations, name changes, or urgent group departure inquiries.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/923001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp Operations
            </a>
            <span className="text-xs font-mono font-bold text-slate-300">+92 21 3456 7890</span>
          </div>
        </div>

        {/* Bank Wire Top-Up Instructions */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Wallet size={18} />
            <h3 className="text-sm font-bold text-white">Advance Deposit Account (HBL)</h3>
          </div>
          <p className="text-xs text-slate-400">
            Wire payments to credit your agency wallet balance within 15 minutes.
          </p>
          <div className="text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 flex items-center justify-between">
            <span>IBAN: PK36HABB0004279820182301</span>
            <span className="text-[10px] text-emerald-400 font-bold">GNK Connect (Pvt) Ltd</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AgentDashboardPage;
