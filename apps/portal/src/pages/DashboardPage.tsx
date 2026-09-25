import { StatCard, StatusBadge, Button } from '@gnk/ui';
import { TrendingUp, Users, Calendar, AlertCircle, ArrowRight, Plane, Map, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const accountStatus = 'APPROVED';

  return (
    <div className="space-y-8 flex flex-col w-full pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 text-indigo-500/20">
          <Plane className="w-64 h-64 transform rotate-45" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={accountStatus} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1" />
              <span className="text-sm font-medium text-indigo-200 uppercase tracking-wider">ABC Travels & Tours</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Welcome back, Tariq!
            </h2>
            <p className="text-indigo-200 max-w-xl text-lg">
              You have 3 upcoming group departures this month and your wallet balance is looking healthy.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link to="/groups">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-indigo-50 shadow-lg shadow-indigo-900/20 font-semibold transition-all hover:scale-105 active:scale-95">
                Browse Groups
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value="12"
          description="Active and completed"
          icon={<Calendar className="w-5 h-5 text-indigo-500" />}
          trend={{ value: 20, label: "vs last month", isPositive: true }}
          className="border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300"
        />
        <StatCard
          title="Upcoming Departures"
          value="3"
          description="In the next 30 days"
          icon={<Plane className="w-5 h-5 text-emerald-500" />}
          className="border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300"
        />
        <StatCard
          title="Wallet Balance"
          value="Rs 850,000"
          description="Available for booking"
          icon={<DollarSign className="w-5 h-5 text-blue-500" />}
          className="border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300"
        />
        <StatCard
          title="Pending Actions"
          value="1"
          description="Awaiting payment verification"
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          className="border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300 ring-1 ring-amber-500/20 bg-amber-500/5"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-white p-1 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b">
              <h3 className="text-lg font-bold">Recent Bookings</h3>
              <Link to="/bookings" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">No recent bookings</h4>
              <p className="text-sm text-slate-500 max-w-sm">
                You haven't made any bookings in the last 30 days. Browse our catalog to find exciting wholesale group tours.
              </p>
              <Link to="/groups" className="mt-6">
                <Button variant="outline" className="rounded-full px-6">Explore Catalog</Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Sidebar Area */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
            <h3 className="text-lg font-bold mb-4 relative z-10">Quick Links</h3>
            <div className="space-y-3 relative z-10">
              <Link to="/groups" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group/link">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover/link:bg-indigo-600 group-hover/link:text-white transition-colors">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">View Catalog</p>
                  <p className="text-xs text-slate-500">Browse all wholesale groups</p>
                </div>
              </Link>
              <Link to="/team" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group/link">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover/link:bg-blue-600 group-hover/link:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Team Management</p>
                  <p className="text-xs text-slate-500">Update your agency team</p>
                </div>
              </Link>
              <Link to="/payments" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group/link">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover/link:bg-emerald-600 group-hover/link:text-white transition-colors">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Wallet Ledger</p>
                  <p className="text-xs text-slate-500">Check balance & top-ups</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
