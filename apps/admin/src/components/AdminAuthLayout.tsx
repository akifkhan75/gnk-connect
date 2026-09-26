import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthLayout, Logo } from '@gnk/ui';

export function AdminAuthLayout(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AuthLayout
      {...props}
      brand={
        <>
          <Logo product="Admin Console" onDark className="hidden lg:inline-flex" />
          <Logo product="Admin Console" className="lg:hidden" />
        </>
      }
      panel={
        <div>
          <span className="inline-flex size-11 items-center justify-center rounded-lg bg-white/10 text-[#00A3E0]">
            <ShieldCheck className="size-6" />
          </span>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight">
            GNK Connect operations
          </h2>
          <p className="mt-3 text-white/70">
            Partner approvals, bookings, payments, pricing and supplier operations. Access is
            restricted to GNK staff. Every action is logged.
          </p>
        </div>
      }
    />
  );
}
