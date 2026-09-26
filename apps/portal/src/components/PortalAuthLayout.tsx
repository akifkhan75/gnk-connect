import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Plane, Wallet } from 'lucide-react';
import { AuthLayout, Logo } from '@gnk/ui';

const POINTS = [
  {
    icon: Plane,
    title: 'Live group inventory',
    body: 'Group tickets to Jeddah, Madinah, Dubai and Riyadh, plus Umrah packages, with seats updated from the airline.',
  },
  {
    icon: Wallet,
    title: 'Partner rates and credit',
    body: 'Your own net-to-agent fares, a running account balance and credit line, and clear statements.',
  },
  {
    icon: BadgeCheck,
    title: 'Booked and confirmed by GNK',
    body: 'Request seats in minutes. Our operations team confirms with the airline and sends your PNR.',
  },
];

export function PortalAuthLayout(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <AuthLayout
      {...props}
      brand={
        <Link to="/" className="inline-block">
          <Logo product="Partner Portal" onDark className="hidden lg:inline-flex" />
          <Logo product="Partner Portal" className="lg:hidden" />
        </Link>
      }
      panel={
        <div>
          <h2>Wholesale travel for Pakistan's travel agents.</h2>
          <ul className="mt-8 space-y-6">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-white/55">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
