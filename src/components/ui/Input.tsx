import React from 'react';
import { cn } from './cn';

export type InputVariant = 'filled' | 'outline' | 'inline';

const VARIANTS: Record<InputVariant, string> = {
  filled:
    'w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800',
  outline:
    'w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-mono font-bold focus:outline-hidden',
  inline:
    'w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden',
};

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'filled', className, ...props }, ref) => (
    <input ref={ref} className={cn(VARIANTS[variant], className)} {...props} />
  )
);

Input.displayName = 'Input';
