import React from 'react';
import { Layout, Sliders, Crop } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../../i18n/I18nContext';

export type TabType = 'layout' | 'scaling' | 'margins';

interface TabNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  layoutBadge?: string;
  duplexBadge?: string;
  marginBadge?: string;
}

interface TabItem {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  badge?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onChangeTab,
  layoutBadge,
  duplexBadge,
  marginBadge,
}) => {
  const { t } = useI18n();

  const tabs: TabItem[] = [
    {
      id: 'layout',
      label: t.tabs.layout,
      shortLabel: t.tabs.shortLayout,
      icon: <Layout className="w-3.5 h-3.5 shrink-0" />,
      badge: layoutBadge,
    },
    {
      id: 'scaling',
      label: t.tabs.adjustments,
      shortLabel: t.tabs.shortAdjustments,
      icon: <Sliders className="w-3.5 h-3.5 shrink-0" />,
      badge: duplexBadge,
    },
    {
      id: 'margins',
      label: t.tabs.margins,
      shortLabel: t.tabs.shortMargins,
      icon: <Crop className="w-3.5 h-3.5 shrink-0" />,
      badge: marginBadge,
    },
  ];

  return (
    <nav aria-label={t.tabs.navAria} className="p-3 border-b border-neutral-200/80 bg-neutral-50/50 shrink-0 select-none">
      <div className="grid grid-cols-3 p-1 bg-neutral-200/60 rounded-xl gap-1 relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer z-10 ${
                isActive ? 'text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id={`tab-${tab.id}`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-xs border border-neutral-200/80 -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded-sm ${
                    isActive ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-300/60 text-neutral-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
