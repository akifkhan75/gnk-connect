import type { ReactNode } from 'react';
import { cn } from '@gnk/ui';

export function TealCard({
  title,
  icon,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl bg-surface shadow-card', className)}>
      <header className="flex items-center gap-2 bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-foreground">
        {icon}
        {title}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
