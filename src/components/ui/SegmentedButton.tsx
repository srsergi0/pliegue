import React from 'react';
import { cn } from './cn';

export type SegmentedButtonSize = 'xs' | 'sm' | 'md' | 'wide';

const SIZES: Record<SegmentedButtonSize, string> = {
  xs: 'text-xs py-1 rounded-md',
  sm: 'text-[11px] py-1.5 rounded-md',
  md: 'text-xs py-1.5 px-1 rounded-md',
  wide: 'text-xs py-1.5 px-2 rounded-md gap-1.5',
};

export interface SegmentedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  size?: SegmentedButtonSize;
}

export const SegmentedButton = React.forwardRef<
  HTMLButtonElement,
  SegmentedButtonProps
>(({ active, size = 'md', type = 'button', className, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'flex items-center justify-center font-semibold text-center transition-all cursor-pointer disabled:cursor-not-allowed',
      active
        ? 'bg-neutral-900 text-white shadow-xs'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60',
      SIZES[size],
      className
    )}
    {...props}
  />
));

SegmentedButton.displayName = 'SegmentedButton';
