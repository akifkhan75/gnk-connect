
import { StatCard, StatusBadge, Button } from '@gnk/ui';
import { TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const accountStatus = 'APPROVED';

  return (
    <div className="space-y-6 flex flex-col w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={accountStatus} className="px-3 py-1 text-sm" />
          {accountStatus === 'APPROVED' && (
            <Button>Book New Group</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value="12"
          description="Active and completed bookings"
          icon={<Calendar />}
          trend={{ value: 20, label: "vs last month", isPositive: true }}
        />
        <StatCard
          title="Upcoming Departures"
          value="3"
          description="In the next 30 days"
          icon={<TrendingUp />}
        />
        <StatCard
          title="Active Team Members"
          value="4"
          icon={<Users />}
        />
        <StatCard
          title="Pending Actions"
          value="1"
          description="Awaiting payment verification"
          icon={<AlertCircle className="text-warning" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <div className="col-span-4 rounded-xl border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
          {/* DataTable goes here later */}
          <div className="flex items-center justify-center h-48 border border-dashed rounded-lg text-muted-foreground text-sm">
            No recent bookings found.
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="space-y-4">
            <a href="#" className="block p-3 rounded-md border hover:bg-muted transition">
              <p className="font-medium">View Catalog</p>
              <p className="text-xs text-muted-foreground">Browse all wholesale groups</p>
            </a>
            <a href="#" className="block p-3 rounded-md border hover:bg-muted transition">
              <p className="font-medium">Account Settings</p>
              <p className="text-xs text-muted-foreground">Update your agency profile</p>
            </a>
            <a href="#" className="block p-3 rounded-md border hover:bg-muted transition">
              <p className="font-medium">Help & Support</p>
              <p className="text-xs text-muted-foreground">Contact our team</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
