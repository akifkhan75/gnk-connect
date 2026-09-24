import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { DemoUserSwitcher } from './DemoUserSwitcher';
import { B2BNotificationDropdown } from './B2BNotificationDropdown';
import { 
  Compass, 
  Layers, 
  CalendarDays, 
  FileText, 
  Building2, 
  LogOut, 
  AlertCircle, 
  CheckCircle2,
  Wallet 
} from 'lucide-react';

export const AgentLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentAgency, isApprovedAgent, isPendingAgent, logout } = useB2BAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/agent/dashboard', icon: Layers },
    { name: 'Available Groups', path: '/agent/groups', icon: CalendarDays },
    { name: 'My Bookings', path: '/agent/bookings', icon: FileText },
    { name: 'Wallet & Ledger', path: '/agent/ledger', icon: Wallet },
    { name: 'Agency Profile', path: '/agent/profile', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      <DemoUserSwitcher />

      {/* Agent Top Navigation */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/agent/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight text-white">
                    GNK <span className="text-cyan-400">ELITE</span>
                  </span>
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                    B2B Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>

            {/* User Details & Status */}
            <div className="flex items-center gap-3">
              {currentUser && (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-white">
                      {currentAgency?.name || currentUser.fullName}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 text-[11px]">
                      {isApprovedAgent ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Verified Partner
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium flex items-center gap-0.5">
                          <AlertCircle size={11} /> Pending Review
                        </span>
                      )}
                    </div>
                  </div>

                  <B2BNotificationDropdown />

                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}`}
                    alt={currentUser.fullName}
                    className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800 object-cover"
                  />

                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-slate-800/80 px-2 py-2 flex items-center justify-around bg-slate-900/95">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-semibold ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={16} className="mb-0.5" />
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Pending Account Notice Banner */}
      {isPendingAgent && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 px-4 py-3 text-sm text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Account Pending Verification:</strong> Your registration and documents are under GNK Operations review. You can browse live departures, but booking requests will activate upon admin approval.
              </span>
            </div>
            <Link
              to="/agent/profile"
              className="text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              View Verification Status →
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 GNK Connect / GNK Elite B2B Reseller Network. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-cyan-400 transition-colors">Public Website</Link>
            <Link to="/contact" className="hover:text-cyan-400 transition-colors">Partner Support</Link>
            <Link to="/admin" className="text-amber-400 hover:text-amber-300 transition-colors">Admin Gateway</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
