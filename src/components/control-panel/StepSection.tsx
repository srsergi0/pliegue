import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface StepSectionProps {
  id: string;
  index: number;
  title: string;
  hint?: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * Collapsible workflow step used by the linear control panel.
 * Controlled from the parent so the job summary can reveal a step on demand.
 */
export const StepSection: React.FC<StepSectionProps> = ({
  id,
  index,
  title,
  hint,
  icon,
  open,
  onToggle,
  children,
}) => {
  const { t } = useI18n();

  return (
    <section
      id={id}
      className="shrink-0 bg-neutral-50/90 rounded-xl border border-neutral-200/90 overflow-hidden scroll-mt-2"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-content`}
        title={open ? t.steps.collapseSection : t.steps.expandSection}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left cursor-pointer hover:bg-neutral-100/70 transition-colors"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold shrink-0">
          {index}
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-neutral-700 shrink-0">{icon}</span>
          <span className="text-xs font-bold text-neutral-800 truncate">{title}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 ml-auto shrink-0 transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
      </button>

      {open && (
        <div id={`${id}-content`} className="px-3.5 pb-3.5 flex flex-col gap-2.5">
          {hint && <p className="text-[10px] text-neutral-400 -mt-0.5">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
};
