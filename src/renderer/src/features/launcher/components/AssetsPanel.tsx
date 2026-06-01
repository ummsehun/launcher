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
      <div className="flex h-full w-full items-center justify-center bg-launcher-bg text-launcher-textMuted">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const typedSeriesId = selectedSeriesId as TerminalSeriesId;

  return (
    <div className="flex flex-col h-full bg-launcher-bg text-launcher-text overflow-hidden">
      {/* Top bar header */}
      <div className="h-[68px] border-b border-launcher-divider flex items-center justify-between pl-8 pr-20 bg-launcher-panel/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-[16px] font-bold text-launcher-text">
            {t('launcher.feature_modal.assets.title')}
          </h3>
          <div className="h-3 w-[1px] bg-launcher-divider"></div>
          <span className="text-[12.5px] text-launcher-textMuted font-medium truncate max-w-xl">
            {t(`launcher.feature_modal.assets.desc_${selectedSeriesId}`)}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto scrollbar-none flex flex-col">
        {config.assetMode === 'youtube' ? (
          <MediaDownloadPanel seriesId={typedSeriesId} />
        ) : (
          <AssetListPanel seriesId={typedSeriesId} />
        )}
      </div>
    </div>
  );
};
