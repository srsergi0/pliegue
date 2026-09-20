import React from 'react';
import { cn } from './cn';

export type SelectVariant = 'default' | 'subtle' | 'amber';

const VARIANTS: Record<SelectVariant, string> = {
  default:
    'w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:ring-1 focus:ring-neutral-400 focus:outline-hidden',
  subtle:
    'bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800 font-medium focus:outline-hidden',
  amber:
    'bg-white border border-amber-300 rounded-md px-2 py-1 text-xs text-neutral-800 font-medium focus:outline-hidden',
};

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: SelectVariant;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant = 'default', className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(VARIANTS[variant], className)}
      {...props}
    />
  )
);

Select.displayName = 'Select';
