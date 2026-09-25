import * as React from 'react';
import { cn } from '../components/Button';

export interface AuthLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  logo?: React.ReactNode;
  imageSlot?: React.ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  logo,
  imageSlot,
  children,
  className,
  ...props
}: AuthLayoutProps) {
  return (
    <div
      className={cn('grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background', className)}
      {...props}
    >
      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {logo && <div className="mb-8">{logo}</div>}
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="hidden lg:block relative w-full h-full bg-surface">
        {imageSlot ? (
          <div className="absolute inset-0 h-full w-full object-cover">{imageSlot}</div>
        ) : (
          <div className="absolute inset-0 bg-primary opacity-10 mix-blend-multiply" />
        )}
      </div>
    </div>
  );
}
