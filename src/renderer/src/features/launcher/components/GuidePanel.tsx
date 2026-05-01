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
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-white/50 font-medium">
        <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-white/5 bg-[#111] shadow-2xl">
          <BookOpen size={48} className="text-white/20" strokeWidth={1.5} />
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
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-0"></div>
      
      <div className="p-10 pb-6 border-b border-white/5 flex items-end justify-between relative z-10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">{t('launcher.feature_modal.guide.title', 'User Guide')}</h2>
          <p className="text-[14px] text-white/50 mt-2">{t('launcher.feature_modal.guide.desc', 'Learn how to use features effectively')}</p>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto scrollbar-none relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Card */}
          <div className="bg-gradient-to-br from-[#1c1c1e] to-[#111111] border border-white/5 rounded-3xl p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none text-blue-500">
              <BookOpen size={180} />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-bold uppercase tracking-widest mb-6">
                <BookOpen size={14} />
                <span>Getting Started</span>
              </div>
              
              <h3 className="text-3xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                {t(`launcher.feature_modal.guide.${gKey}_title`)}
              </h3>
              <p className="text-[16px] text-white/60 leading-relaxed font-medium">
                {t(`launcher.feature_modal.guide.${gKey}_desc`)}
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div>
            <h4 className="text-[13px] font-bold text-white/40 uppercase tracking-widest mb-6 ml-2 flex items-center gap-2">
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
                  <div key={num} className="group relative bg-[#141414] border border-white/5 rounded-2xl p-6 hover:bg-[#1a1a1c] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex gap-5">
                      <div className="w-12 h-12 rounded-xl bg-[#222] border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {icon}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[15px] font-medium text-white/80 leading-relaxed group-hover:text-white transition-colors">
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
