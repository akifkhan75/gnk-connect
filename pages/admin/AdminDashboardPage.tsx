import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { b2bStore } from '../../services/b2b/b2bStore';
import { 
  Shield, 
  Users, 
  FileCheck2, 
  Percent, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Send, 
  TrendingUp
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    pendingAgents: 0,
    totalAgents: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalRevenuePKR: 0,
    totalMarkupPKR: 0
  });
  const [pendingBookingsList, setPendingBookingsList] = useState<any[]>([]);
  const [pendingAgentsList, setPendingAgentsList] = useState<any[]>([]);

  useEffect(() => {
    const update = () => {
      const users = b2bStore.getUsers().filter(u => u.role !== 'GNK_ADMIN');
      const bookings = b2bStore.getBookings();

      const pendingUsers = users.filter(u => u.approvalStatus === 'PENDING_VERIFICATION' || u.approvalStatus === 'ADMIN_REVIEW');
      const pendingB = bookings.filter(b => b.status === 'PENDING_APPROVAL');
      const confirmedB = bookings.filter(b => b.status === 'SUPPLIER_CONFIRMED');

      const revenue = confirmedB.reduce((acc, b) => acc + b.totalAgentSellingPricePKR, 0);
      const markup = confirmedB.reduce((acc, b) => acc + b.totalMarkupPKR, 0);

      setStats({
        pendingAgents: pendingUsers.length,
        totalAgents: users.length,
        pendingBookings: pendingB.length,
        confirmedBookings: confirmedB.length,
        totalRevenuePKR: revenue,
        totalMarkupPKR: markup
      });

      setPendingBookingsList(pendingB.slice(0, 4));
      setPendingAgentsList(pendingUsers.slice(0, 4));
    };

    update();
    return b2bStore.subscribe(update);
  }, []);

  const handleApproveAgent = (userId: string) => {
    b2bStore.updateAgentStatus(userId, 'APPROVED');
  };

  const handleApproveBooking = async (bookingId: string) => {
    await b2bStore.approveAndPushToSupplier(bookingId, 'GNK Admin');
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Shield size={12} /> GNK Elite Operations
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Radio size={11} className="animate-pulse" /> AirDesk Supplier Online
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              B2B Marketplace Command Center
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Control partner agent verifications, oversee hierarchical pricing margins, and review B2B booking requests before automated dispatch to AirDesk Groups API.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/pricing"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Percent size={16} /> Manage Pricing Rules
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Agent Approvals</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-400">{stats.pendingAgents}</span>
            <p className="text-xs text-slate-400 mt-1">Out of {stats.totalAgents} total registered partners</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bookings Awaiting Push</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-cyan-400">{stats.pendingBookings}</span>
            <p className="text-xs text-slate-400 mt-1">{stats.confirmedBookings} bookings confirmed by AirDesk</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmed B2B Gross</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">PKR {stats.totalRevenuePKR.toLocaleString()}</span>
            <p className="text-xs text-slate-400 mt-1">Active wholesale volume</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total GNK Margin</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Percent size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-400">PKR {stats.totalMarkupPKR.toLocaleString()}</span>
            <p className="text-xs text-slate-400 mt-1">Retained reseller markup</p>
          </div>
        </div>
      </div>

      {/* Operational Queues: Bookings & Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Bookings Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <FileCheck2 size={18} className="text-cyan-400" />
                Booking Review & AirDesk Dispatch
              </h2>
              <p className="text-xs text-slate-400">Approve payment & trigger AirDesk API booking creation</p>
            </div>
            <Link to="/admin/bookings" className="text-xs font-bold text-amber-400 hover:text-amber-300">
              View All →
            </Link>
          </div>

          {pendingBookingsList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No pending booking requests. All bookings processed.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingBookingsList.map((b) => (
                <div key={b.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-cyan-400 text-xs">{b.id}</span>
                      <span className="text-slate-400 text-xs ml-2">by <strong>{b.agencyName || b.agentName}</strong></span>
                    </div>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                      Payment Submitted
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[200px]">{b.productTitle}</span>
                    <span className="font-black text-amber-400">PKR {b.totalAgentSellingPricePKR.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-400">Ref: {b.paymentReferenceNumber || 'Manual Slip'}</span>
                    <button
                      onClick={() => handleApproveBooking(b.id)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Send size={12} /> Verify & Push to AirDesk
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Agent Verification Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                Agent Partner Verifications
              </h2>
              <p className="text-xs text-slate-400">Review agency licenses and approve B2B access</p>
            </div>
            <Link to="/admin/agents" className="text-xs font-bold text-amber-400 hover:text-amber-300">
              View All →
            </Link>
          </div>

          {pendingAgentsList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No agents pending approval. All registrations verified.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAgentsList.map((agent) => (
                <div key={agent.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={agent.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${agent.fullName}`}
                      alt={agent.fullName}
                      className="w-10 h-10 rounded-xl bg-slate-800 object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{agent.fullName}</h4>
                      <p className="text-[11px] text-slate-400">{agent.email} • {agent.accountType}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApproveAgent(agent.id)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all shadow-sm"
                  >
                    <CheckCircle2 size={13} /> Approve Partner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
