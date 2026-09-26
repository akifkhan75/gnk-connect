import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Split auth screen: brand panel (hidden on mobile) + form column.
 * `panel` lets each app describe its own value proposition.
 */
export function AuthLayout({
  brand,
  panel,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  brand: React.ReactNode;
  panel: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-[#00205B] text-white lg:flex lg:flex-col">
        {/* Subtle route-map pattern */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
          <defs>
            <pattern id="gnk-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gnk-grid)" />
        </svg>
        <svg
          className="absolute -right-24 top-1/4 h-[480px] w-[480px] opacity-25"
          viewBox="0 0 400 400"
          aria-hidden
        >
          <path
            d="M20 320 C 140 120, 260 120, 380 60"
            fill="none"
            stroke="#00A3E0"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
          <circle cx="20" cy="320" r="6" fill="#00A3E0" />
          <circle cx="380" cy="60" r="6" fill="#F59E0B" />
        </svg>
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <div>{brand}</div>
          <div className="max-w-md">{panel}</div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} GNK Connect · Islamabad, Pakistan
          </p>
        </div>
      </aside>
      <main className="flex flex-col">
        <div className="flex h-16 items-center px-6 lg:hidden">{brand}</div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className={cn('w-full', wide ? 'max-w-xl' : 'max-w-sm')}>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && (
              <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
