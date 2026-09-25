import { StatCard } from '@gnk/ui';
import { ShieldAlert, Users, TrendingUp, ShieldCheck, Activity, BarChart3, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return (
    <div className="space-y-8 flex flex-col w-full pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white shadow-xl border border-slate-700">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 text-slate-700/50">
          <Activity className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> System Operational
            </span>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">GNK Master Admin</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Operations Command Center
          </h2>
          <p className="text-slate-300 max-w-2xl text-lg">
            Monitor real-time system metrics, manage agency approvals, and oversee wholesale operations across the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Pending KYC Approvals"
          value="5"
          description="Action required immediately"
          icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
          className="border-none shadow-lg shadow-rose-500/10 hover:-translate-y-1 transition-transform duration-300 ring-1 ring-rose-500/20 bg-rose-500/5"
        />
        <StatCard
          title="Active Agencies"
          value="124"
          description="Approved B2B partners"
          icon={<Users className="w-5 h-5 text-blue-500" />}
          trend={{ value: 12, label: "this month", isPositive: true }}
          className="border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300"
        />
        <StatCard
          title="Total Processed GMV"
          value="$1.2M"
          description="Volume in the last 30 days"
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          trend={{ value: 5.4, label: "vs last month", isPositive: true }}
          className="border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-4 mt-4">
        <div className="col-span-4 rounded-2xl border bg-white p-1 shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b bg-slate-50/50">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Quick Actions
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/partners" className="group block p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white text-indigo-600 transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">Partners & KYC</div>
              <div className="text-sm text-slate-500">Review and verify new B2B agency registrations.</div>
            </Link>
            
            <Link to="/pricing" className="group block p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white text-emerald-600 transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">Pricing Engine</div>
              <div className="text-sm text-slate-500">Manage global markups and commission rules.</div>
            </Link>
            
            <Link to="/bookings" className="group block p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white text-blue-600 transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Bookings Queue</div>
              <div className="text-sm text-slate-500">Approve pending bookings and issue vouchers.</div>
            </Link>
            
            <Link to="/suppliers" className="group block p-5 rounded-xl border border-slate-200 bg-white hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white text-purple-600 transition-colors">
                <Database className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">Suppliers & Sync</div>
              <div className="text-sm text-slate-500">Manage AirDesk integration and catalog sync.</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
