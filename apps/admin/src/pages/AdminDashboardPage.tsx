import { StatCard } from '@gnk/ui';
import { ShieldAlert, Users, TrendingUp } from 'lucide-react';

export function AdminDashboardPage() {
  return (
    <div className="space-y-6 flex flex-col w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-muted-foreground mt-1">
          High-level metrics and system alerts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Pending KYC Approvals"
          value="5"
          description="Action required"
          icon={<ShieldAlert className="text-warning" />}
        />
        <StatCard
          title="Active Agencies"
          value="124"
          description="Approved partner accounts"
          icon={<Users />}
          trend={{ value: 12, label: "this month", isPositive: true }}
        />
        <StatCard
          title="Total Processed GMV"
          value="$1.2M"
          description="In the last 30 days"
          icon={<TrendingUp />}
          trend={{ value: 5.4, label: "vs last month", isPositive: true }}
        />
      </div>
    </div>
  );
}
