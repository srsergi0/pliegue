import React from 'react';
import { cn } from './cn';

export type IconButtonTone =
  | 'neutral'
  | 'neutralStrong'
  | 'danger'
  | 'emerald'
  | 'emeraldOnDark'
  | 'amberOnDark'
  | 'neutralOnDark'
  | 'preview';

export type IconButtonSize = 'sm' | 'md' | 'lg';

const TONES: Record<IconButtonTone, string> = {
  neutral: 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60',
  neutralStrong: 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100',
  danger: 'text-neutral-400 hover:text-red-600 hover:bg-red-50',
  emerald: 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100/80',
  emeraldOnDark: 'text-emerald-300 hover:text-white hover:bg-emerald-800',
  amberOnDark: 'text-amber-200 hover:text-white hover:bg-white/10',
  neutralOnDark: 'text-neutral-400 hover:text-white hover:bg-neutral-800',
  preview:
    'text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent',
};

const SIZES: Record<IconButtonSize, string> = {
  sm: 'p-1 rounded-md',
  md: 'p-1.5 rounded-md',
  lg: 'p-1.5 rounded-lg',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: IconButtonTone;
  size?: IconButtonSize;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tone = 'neutral', size = 'md', type = 'button', className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed',
        TONES[tone],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
);

IconButton.displayName = 'IconButton';
