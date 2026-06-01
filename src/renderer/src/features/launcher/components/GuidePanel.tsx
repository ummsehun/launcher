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
      {/* Top bar header */}
      <div className="h-[68px] border-b border-launcher-divider flex items-center justify-between pl-8 pr-20 bg-launcher-panel/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-[16px] font-bold text-launcher-text">
            {t('launcher.feature_modal.guide.title', 'User Guide')}
          </h3>
          <div className="h-3 w-[1px] bg-launcher-divider"></div>
          <span className="text-[12.5px] text-launcher-textMuted font-medium">
            {t('launcher.feature_modal.guide.desc', 'Learn how to use features effectively')}
          </span>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto scrollbar-none relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Card */}
          <div className="bg-launcher-surface/10 border border-launcher-divider rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-blue-500">
              <BookOpen size={160} />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold mb-4">
                <BookOpen size={12} />
                <span>Getting Started</span>
              </div>
              
              <h3 className="text-xl font-bold text-launcher-text mb-3 tracking-tight leading-tight">
                {t(`launcher.feature_modal.guide.${gKey}_title`)}
              </h3>
              <p className="text-[14.5px] text-launcher-textMuted leading-relaxed font-medium">
                {t(`launcher.feature_modal.guide.${gKey}_desc`)}
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div>
            <h4 className="text-[13px] font-semibold text-launcher-textMuted mb-4 ml-1 flex items-center gap-2">
              <Settings size={14} />
              {t(`launcher.feature_modal.guide.${gKey}_features`, 'Key Features')}
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((num, idx) => {
                const featureTextKey = `launcher.feature_modal.guide.${gKey}_f${num}`;
                const text = t(featureTextKey);
                if (text === featureTextKey && num > 3) return null;

                const icon = featureIcons[idx % featureIcons.length];

                return (
                  <div key={num} className="group relative bg-launcher-surface/5 border border-launcher-divider rounded-xl p-5 hover:bg-launcher-surface/10 transition-colors">
                    <div className="relative z-10 flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-launcher-surface/50 border border-launcher-divider flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[14px] font-normal text-launcher-text leading-relaxed transition-colors">
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
