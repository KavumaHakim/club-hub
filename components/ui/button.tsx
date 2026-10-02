import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.08em] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ch-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep',
        secondary: 'border border-ch-rule text-ch-text hover:bg-ch-surface',
        ghost: 'text-ch-muted hover:bg-ch-surface hover:text-ch-text',
        destructive: 'border border-ch-accent text-ch-accent hover:bg-ch-accent-soft',
        success: 'bg-ch-text text-ch-bg hover:opacity-85',
        outline: 'border border-ch-accent text-ch-accent hover:bg-ch-accent-soft',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-[11px]',
        lg: 'h-11 px-5 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
