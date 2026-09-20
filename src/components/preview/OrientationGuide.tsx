import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Info } from 'lucide-react';

/**
 * Footer orientation guide. Highlights the {flip} / {light} keywords from the
 * localized description.
 */
export const OrientationGuide: React.FC = () => {
  const { t } = useI18n();

  const renderOrientationDesc = () => {
    const parts = t.preview.orientationDesc.split(/(\{flip\}|\{light\})/g);
    return parts.map((part, i) => {
      if (part === '{flip}') {
        return <strong key={i} className="text-neutral-700 font-semibold">{t.preview.flipWord}</strong>;
      }
      if (part === '{light}') {
        return <strong key={i} className="text-amber-800 font-semibold">{t.preview.lightWord}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="mt-3 bg-white rounded-lg p-3 text-xs text-neutral-500 border border-neutral-200/80 flex gap-2 items-start select-none shadow-2xs">
      <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
      <div className="leading-relaxed">
        <p className="font-semibold text-neutral-700 mb-0.5">
          {t.preview.orientationTitle.replace('{head}', t.preview.headAbbr)}
        </p>
        <p className="text-[11px] text-neutral-500">
          {renderOrientationDesc()}
        </p>
      </div>
    </div>
  );
};
