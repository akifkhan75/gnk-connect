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
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="mt-6">GNK Connect operations.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Partner approvals, bookings, payments, pricing and supplier operations. Access is
            restricted to GNK staff. Every action is logged.
          </p>
        </div>
      }
    />
  );
}
