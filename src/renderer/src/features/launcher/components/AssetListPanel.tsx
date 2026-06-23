import React, { useEffect, useState } from 'react';
import { Box, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type AssetDownloadProgress, type AssetInfo } from '@shared/launcherTypes';
import { type TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';

type AssetListPanelProps = {
  seriesId: TerminalSeriesId;
};

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

export const AssetListPanel: React.FC<AssetListPanelProps> = ({ seriesId }) => {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [downloads, setDownloads] = useState<Record<string, AssetDownloadProgress>>({});

  useEffect(() => {
    window.launcher.assets.list(seriesId).then((result) => {
      if (result.ok) {
        setAssets(result.data);
      }
    });
  }, [seriesId]);

  useEffect(() => {
    return window.launcher.assets.onProgress((event) => {
      setDownloads((prev) => ({ ...prev, [event.assetId]: event }));
    });
  }, []);

  const handleDownloadAsset = async (assetId: string) => {
    await window.launcher.assets.download(seriesId, assetId);
  };

  const handleCancelDownload = async (downloadId: string) => {
    await window.launcher.assets.cancel(downloadId);
  };

  return (
    <div className="space-y-2.5">
      {assets.map((asset) => {
        const download = downloads[asset.id];
        const isDownloading = download && download.status === 'downloading';
        const isCompleted = download && download.status === 'completed';

        return (
          <div key={asset.id} className="flex flex-col gap-2 p-4 rounded-lg border border-launcher-divider bg-launcher-surface/5 hover:bg-launcher-surface/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center text-launcher-textMuted shrink-0">
                  <Box size={18} className="text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[14px] text-launcher-text font-semibold">{asset.name}</h4>
                  <span className="text-[12.5px] text-launcher-textMuted mt-0.5">
                    {t('launcher.feature_modal.assets.type')}: {asset.type} • {t('launcher.feature_modal.assets.size')}: {formatSize(asset.sizeBytes)}
                  </span>
                </div>
              </div>

              {isCompleted ? (
                <div className="px-4 py-1.5 rounded-lg bg-green-600/10 text-green-400 font-semibold text-[13px] flex items-center gap-2">
                  {t('launcher.feature_modal.assets.completed', 'Completed')}
                </div>
              ) : isDownloading ? (
                <button
                  onClick={() => handleCancelDownload(download.downloadId)}
                  className="px-4 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 font-semibold text-[13px] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {t('launcher.feature_modal.assets.cancel', 'Cancel')}
                </button>
              ) : (
                <button
                  onClick={() => handleDownloadAsset(asset.id)}
                  className="px-4 py-1.5 rounded-lg bg-launcher-accent hover:bg-launcher-accentHover text-white font-semibold text-[13px] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>{t('launcher.feature_modal.assets.download')}</span>
                </button>
              )}
            </div>

            {isDownloading && (
              <div className="w-full bg-launcher-control h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-launcher-accent h-full transition-all duration-300"
                  style={{ width: `${download.progress}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
