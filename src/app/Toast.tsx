import React from 'react';
import { Sparkles } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-neutral-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
