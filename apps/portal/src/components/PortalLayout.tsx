import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Layers, 
  CalendarDays, 
  FileText, 
  Building2, 
  LogOut, 
  AlertCircle, 
  CheckCircle2,
  Wallet,
  Users,
  Search,
  PlusCircle,
  Bell
} from 'lucide-react';
import { ThemeToggle } from '@gnk/ui';

export function PortalLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy auth state for now
  const canViewFinances = true;
  const canManageTeam = true;
  const currentAgency = { name: 'ABC Travels', walletBalancePKR: 500000, creditLimitPKR: 0 };
  const currentUser = { fullName: 'Tariq Mansoor' };
  const isApprovedAgent = true;
  const isPendingAgent = false;
  const availableFloat = 500000;

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/bookings?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { name: 'AirDesk Dashboard', path: '/', icon: Layers, show: true },
    { name: 'Group Inventory', path: '/groups', icon: CalendarDays, show: true, badge: 'Live Series' },
    { name: 'Bookings & PNRs', path: '/bookings', icon: FileText, show: true },
    { name: 'Wallet & Ledger', path: '/payments', icon: Wallet, show: canViewFinances },
    { name: 'Team & RBAC', path: '/team', icon: Users, show: canManageTeam, badge: 'RBAC' },
    { name: 'Agency Profile', path: '/profile', icon: Building2, show: true },
  ].filter(link => link.show);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">

      {/* AirDesk Top Workspace Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Left: Brand Logo & Sync Heartbeat */}
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black tracking-tight text-white">
                      GNK <span className="text-cyan-400">ELITE</span>
                    </span>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                      AirDesk GDS
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>AirDesk API: Connected</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Center: Global PNR & Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-2">
              <form onSubmit={handleGlobalSearch} className="w-full relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search PNR, GNK ID (e.g. GNK-2026-00124), or passenger..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </form>
            </div>

            {/* Right: Quick Float Widget & User Profile */}
            <div className="flex items-center gap-3">
              
              {/* Financial Float Badge */}
              {canViewFinances && currentAgency && (
                <div 
                  onClick={() => navigate('/payments')}
                  className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all"
                  title="Click to view Statement of Account (SOA)"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Wallet size={14} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Available Float</div>
                    <div className="text-xs font-mono font-black text-emerald-400">
                      PKR {availableFloat.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <button className="relative p-2 text-slate-400 hover:text-cyan-400 transition-colors">
                <Bell size={20} />
              </button>
              
              <ThemeToggle />

              {/* User Role & Profile Card */}
              {currentUser && (
                <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-white leading-tight">
                      {currentAgency?.name || currentUser.fullName}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] mt-0.5">
                      <span className="text-amber-300 font-bold bg-amber-500/10 px-1.5 rounded">👑 Owner</span>
                      {isApprovedAgent ? (
                        <span className="text-emerald-400 font-bold flex items-center">
                          <CheckCircle2 size={10} className="ml-1" />
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold">● Pending</span>
                      )}
                    </div>
                  </div>

                  <Link to="/profile">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}`}
                      alt={currentUser.fullName}
                      className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 object-cover hover:border-cyan-400 transition-colors"
                    />
                  </Link>

                  <button
                    title="Sign Out of Session"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Secondary AirDesk Sub-Nav Bar */}
        <div className="border-t border-slate-800/80 bg-slate-900/60 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <nav className="flex items-center gap-1 py-1.5">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-extrabold uppercase ${
                        isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-cyan-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 text-xs">
              <Link
                to="/groups"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold"
              >
                <PlusCircle size={13} />
                <span>Quick Hold Seats</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children || <Outlet />}
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/90 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>AirDesk Groups Engine v2.4 • GNK Connect B2B Network</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="http://localhost:3000" className="hover:text-cyan-400 transition-colors">Public Website</a>
            <a href="http://localhost:3002" className="text-amber-400/80 hover:text-amber-300 transition-colors">GNK Command Gateway</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
