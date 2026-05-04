import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig } from '../../terminal-series/constants/seriesFeatureConfig';
import { BookOpen, Sparkles, Terminal, Settings, Zap, Shield, Rocket } from 'lucide-react';

export const GuidePanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId } = useTerminalSeriesStore();
  const config = getSeriesFeatureConfig(selectedSeriesId);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-launcher-bg text-launcher-textMuted font-medium">
        <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-launcher-divider bg-launcher-panel shadow-2xl">
          <BookOpen size={48} className="text-launcher-muted" strokeWidth={1.5} />
          <span>{t('launcher.series_not_selected', 'Please select a series first')}</span>
        </div>
      </div>
    );
  }

  const gKey = config.guideKey;
  
  const featureIcons = [
    <Rocket size={24} className="text-blue-400" />,
    <Sparkles size={24} className="text-purple-400" />,
    <Zap size={24} className="text-amber-400" />,
    <Shield size={24} className="text-emerald-400" />,
    <Terminal size={24} className="text-rose-400" />
  ];

  return (
    <div className="flex flex-col h-full bg-launcher-bg text-launcher-text overflow-hidden relative">
      <div className="p-10 pb-6 border-b border-launcher-divider flex items-end justify-between relative z-10 bg-launcher-bg/80 backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-bold text-launcher-text tracking-wide">{t('launcher.feature_modal.guide.title', 'User Guide')}</h2>
          <p className="text-[14px] text-launcher-textMuted mt-2">{t('launcher.feature_modal.guide.desc', 'Learn how to use features effectively')}</p>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto scrollbar-none relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Card */}
          <div className="bg-launcher-panelElevated border border-launcher-divider rounded-3xl p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none text-blue-500">
              <BookOpen size={180} />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-bold uppercase tracking-widest mb-6">
                <BookOpen size={14} />
                <span>Getting Started</span>
              </div>
              
              <h3 className="text-3xl font-extrabold text-launcher-text mb-4 tracking-tight leading-tight">
                {t(`launcher.feature_modal.guide.${gKey}_title`)}
              </h3>
              <p className="text-[16px] text-launcher-textMuted leading-relaxed font-medium">
                {t(`launcher.feature_modal.guide.${gKey}_desc`)}
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div>
            <h4 className="text-[13px] font-bold text-launcher-textMuted uppercase tracking-widest mb-6 ml-2 flex items-center gap-2">
              <Settings size={14} />
              {t(`launcher.feature_modal.guide.${gKey}_features`, 'Key Features')}
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((num, idx) => {
                const featureTextKey = `launcher.feature_modal.guide.${gKey}_f${num}`;
                // Check if the translation exists (if it returns the key, it means it doesn't exist)
                const text = t(featureTextKey);
                if (text === featureTextKey && num > 3) return null; // Hide extra keys if missing

                const icon = featureIcons[idx % featureIcons.length];

                return (
                  <div key={num} className="group relative bg-launcher-panel border border-launcher-divider rounded-2xl p-6 hover:bg-launcher-panelElevated transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-launcher-border">
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex gap-5">
                      <div className="w-12 h-12 rounded-xl bg-launcher-iconSurface border border-launcher-divider flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {icon}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[15px] font-medium text-launcher-text leading-relaxed transition-colors">
                          {text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
