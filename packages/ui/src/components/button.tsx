import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13.5px] font-medium tracking-[-0.01em] transition-[background-color,box-shadow,color,transform,filter] duration-150 ease-[var(--ease)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary bg-brand text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18),0_1px_2px_hsl(var(--primary)/0.35),0_4px_12px_-4px_hsl(var(--primary)/0.45)] hover:brightness-[1.07]',
        accent: 'bg-accent text-accent-foreground shadow-sm hover:brightness-95',
        secondary:
          'bg-surface text-foreground shadow-[0_0_0_0.5px_hsl(var(--border-strong)),0_1px_2px_hsl(240_6%_10%/0.06)] hover:bg-muted/70 dark:shadow-[0_0_0_1px_hsl(var(--border-strong))]',
        ghost: 'text-foreground hover:bg-muted',
        danger:
          'bg-danger text-white shadow-[inset_0_1px_0_hsl(0_0%_100%/0.14),0_1px_2px_hsl(var(--danger)/0.3)] hover:brightness-95',
        'danger-outline':
          'bg-surface text-danger shadow-[0_0_0_0.5px_hsl(var(--danger)/0.45)] hover:bg-danger-soft',
        success: 'bg-success text-white shadow-sm hover:brightness-95',
        link: 'h-auto px-0 text-link underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        xs: 'h-7 rounded-md px-2 text-xs [&_svg]:size-3.5',
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-3.5',
        lg: 'h-11 rounded-xl px-5 text-[15px]',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
