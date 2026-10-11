import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        pos: 'border-pos/30 bg-pos/15 text-pos font-semibold',
        neg: 'border-neg/30 bg-neg/15 text-neg font-semibold',
        warn: 'border-warn/30 bg-warn/15 text-warn font-semibold',
        personal: 'border-blue-500/30 bg-blue-500/15 text-blue-400 font-semibold',
        onBehalf: 'border-amber-500/30 bg-amber-500/15 text-amber-400 font-semibold',
        common: 'border-purple-500/30 bg-purple-500/15 text-purple-400 font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
