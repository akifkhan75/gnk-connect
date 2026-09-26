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
      <aside className="relative hidden overflow-hidden bg-[#0a0a0c] text-white lg:flex lg:flex-col">
        {/* Soft light, not decoration: two blurred glows in the brand blues. */}
        <div
          className="absolute -left-32 -top-32 size-[520px] rounded-full bg-[#0071e3] opacity-30 blur-[120px]"
          aria-hidden
        />
        <div
          className="absolute -bottom-40 right-[-120px] size-[460px] rounded-full bg-[#00a3e0] opacity-20 blur-[120px]"
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <div>{brand}</div>
          <div className="max-w-md [&_h2]:text-[34px] [&_h2]:font-semibold [&_h2]:leading-[1.1] [&_h2]:tracking-[-0.03em]">
            {panel}
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} GNK Connect · Islamabad, Pakistan
          </p>
        </div>
      </aside>
      <main className="flex flex-col">
        <div className="flex h-16 items-center px-6 lg:hidden">{brand}</div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div
            className={cn(
              'w-full animate-[gnk-rise_320ms_var(--ease)]',
              wide ? 'max-w-xl' : 'max-w-[360px]',
            )}
          >
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.03em]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && (
              <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
