import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-ch-accent text-ch-accent',
        secondary: 'border-ch-divider text-ch-muted',
        success: 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400',
        warning: 'border-ch-violet text-ch-violet',
        danger: 'border-transparent bg-ch-accent text-ch-on-accent',
        elite: 'border-transparent bg-ch-violet text-ch-bg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
