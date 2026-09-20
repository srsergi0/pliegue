import React, { useEffect, useRef, useState } from 'react';
import { Input, InputProps } from './Input';

export interface NumberFieldProps
  extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * Number input that can be fully cleared while typing. The value is committed
 * live only when it is inside [min, max]; otherwise it is clamped on blur.
 * This avoids the classic "cannot delete the value" bug caused by clamping on
 * every keystroke.
 */
export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  ({ value, onValueChange, min, max, onBlur, onKeyDown, ...props }, ref) => {
    const [draft, setDraft] = useState<string>(String(value));
    const focusedRef = useRef(false);

    // Sync external changes (templates, presets, reset) unless the user is editing.
    useEffect(() => {
      if (!focusedRef.current) setDraft(String(value));
    }, [value]);

    const clamp = (n: number) => {
      let v = n;
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      return v;
    };

    const commit = (raw: string) => {
      const n = parseFloat(raw);
      if (raw.trim() === '' || isNaN(n)) {
        setDraft(String(value));
        return;
      }
      const clamped = clamp(n);
      setDraft(String(clamped));
      if (clamped !== value) onValueChange(clamped);
    };

    return (
      <Input
        ref={ref}
        type="number"
        min={min}
        max={max}
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const n = parseFloat(raw);
          if (raw.trim() !== '' && !isNaN(n)) {
            const withinMin = min === undefined || n >= min;
            const withinMax = max === undefined || n <= max;
            // Commit live only when already valid so intermediate typing
            // (e.g. "5" on the way to "50" when min is 10) is not snapped.
            if (withinMin && withinMax) onValueChange(n);
          }
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          commit(e.target.value);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
          onKeyDown?.(e);
        }}
        {...props}
      />
    );
  }
);

NumberField.displayName = 'NumberField';
