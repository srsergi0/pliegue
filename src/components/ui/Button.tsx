import React from 'react';
import { cn } from './cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'chip'
  | 'soft'
  | 'amber'
  | 'amberSubtle'
  | 'emerald'
  | 'emeraldOutline'
  | 'emeraldWhite'
  | 'dark';

export type ButtonSize = 'xs' | 'sm' | 'smWide' | 'md' | 'mdWide' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-xs disabled:opacity-40 disabled:hover:bg-neutral-900',
  secondary:
    'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium border border-neutral-200 disabled:opacity-40',
  outline:
    'bg-white hover:bg-neutral-100 text-neutral-700 font-medium border border-neutral-200/90 shadow-2xs disabled:opacity-40',
  chip: 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold shadow-2xs',
  soft:
    'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200 font-semibold disabled:opacity-50',
  amber:
    'bg-amber-50 hover:bg-amber-100/90 text-amber-950 border border-amber-200/90 font-semibold shadow-2xs',
  amberSubtle:
    'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold',
  emerald: 'bg-emerald-700 hover:bg-emerald-800 text-white font-medium',
  emeraldOutline:
    'bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300 font-medium',
  emeraldWhite:
    'bg-white hover:bg-emerald-50 text-emerald-950 font-bold shadow-xs',
  dark: 'bg-neutral-950 hover:bg-neutral-900 text-white font-semibold shadow-xs',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'gap-1 px-2 py-0.5 text-[10px] rounded',
  sm: 'gap-1.5 px-2.5 py-1 text-xs rounded-md',
  smWide: 'gap-1.5 px-3.5 py-1.5 text-xs rounded-lg',
  md: 'gap-1.5 px-3 py-2 text-xs rounded-lg',
  mdWide: 'gap-2 px-4 py-2 text-xs rounded-lg',
  lg: 'gap-2 px-4 py-2.5 text-xs rounded-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', type = 'button', className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center transition-all cursor-pointer select-none disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
