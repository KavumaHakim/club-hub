import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
        secondary: 'border-white/10 bg-white/5 text-slate-200',
        success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
        warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
        danger: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
        elite: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100 shadow-[0_0_18px_rgba(192,38,211,0.25)]',
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
