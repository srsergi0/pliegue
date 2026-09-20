import React from 'react';
import { cn } from './cn';

export type CheckboxVariant = 'accent' | 'plain';

const VARIANTS: Record<CheckboxVariant, string> = {
  accent: 'accent-neutral-900',
  plain: 'text-neutral-900 focus:ring-neutral-400',
};

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  variant?: CheckboxVariant;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ variant = 'accent', className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'w-4 h-4 rounded border-neutral-300 cursor-pointer',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
);

Checkbox.displayName = 'Checkbox';
