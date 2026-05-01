import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig, type TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';
import { AssetListPanel } from './AssetListPanel';
import { MediaDownloadPanel } from './MediaDownloadPanel';

export const AssetsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId } = useTerminalSeriesStore();
  const config = getSeriesFeatureConfig(selectedSeriesId);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/50">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const typedSeriesId = selectedSeriesId as TerminalSeriesId;

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-10 pb-6 border-b border-white/5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('launcher.feature_modal.assets.title')}</h2>
          <p className="text-[14px] text-white/50 mt-2">
            {t(`launcher.feature_modal.assets.desc_${selectedSeriesId}`)}
          </p>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto scrollbar-none flex flex-col">
        {config.assetMode === 'youtube' ? (
          <MediaDownloadPanel seriesId={typedSeriesId} />
        ) : (
          <AssetListPanel seriesId={typedSeriesId} />
        )}
      </div>
    </div>
  );
};
