import React, { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type MediaDownloadProgress } from '@shared/launcherTypes';
import { type TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';

type MediaDownloadPanelProps = {
  seriesId: TerminalSeriesId;
};

export const MediaDownloadPanel: React.FC<MediaDownloadPanelProps> = ({ seriesId }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [jobUrl, setJobUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<MediaDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.launcher.mediaDownload.onProgress((event) => {
      setProgress(event);
      if (event.status === 'failed') {
        setError(event.error ?? event.message ?? 'Download failed');
      }
    });

    return unsubscribe;
  }, []);

  const handleCancel = async (jobId: string) => {
    await window.launcher.mediaDownload.cancel(jobId);
  };

  const handleDownload = async (format: 'mp4' | 'mp3') => {
    if (!url) return;

    setError(null);
    setProgress({
      jobId: 'pending',
      status: 'pending',
      percent: 0,
      message: 'Preparing media download',
    });

    const result = await window.launcher.mediaDownload.start({
      seriesId,
      url,
      format,
    });

    if (!result.ok) {
      setError(result.error);
      setProgress({
        jobId: 'failed',
        status: 'failed',
        percent: 0,
        message: 'Media download setup failed',
        error: result.error,
      });
      return;
    }

    setJobUrl(url);
  };

  const reset = () => {
    setProgress(null);
    setError(null);
    setJobUrl(null);
  };

  const isActive = progress && ['pending', 'validating', 'running', 'postprocessing'].includes(progress.status);
  const isCompleted = progress?.status === 'completed';
  const isCancelled = progress?.status === 'cancelled';
  const isFailed = progress?.status === 'failed';

  return (
    <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full space-y-6">
      <div className="relative flex items-center bg-launcher-control rounded-xl border border-launcher-divider overflow-hidden">
        <div className="pl-5 text-launcher-textMuted">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder={t('launcher.feature_modal.assets.yt_placeholder')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full bg-transparent px-4 py-4 text-[15px] text-launcher-text font-medium outline-none placeholder:text-launcher-textMuted"
        />
      </div>

      {isActive ? (
        <div className="w-full bg-launcher-panelElevated p-5 rounded-xl border border-launcher-divider flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-launcher-text text-sm font-bold">
              {progress.status === 'postprocessing'
                ? t('launcher.feature_modal.assets.postprocessing', 'Post-processing...')
                : progress.status === 'validating'
                  ? t('launcher.feature_modal.assets.validating', 'Validating...')
                  : t('launcher.feature_modal.assets.downloading', 'Downloading...')}
            </span>
            <button
              onClick={() => handleCancel(progress.jobId)}
              disabled={progress.jobId === 'pending'}
              className="text-red-400 text-sm font-bold hover:text-red-300 disabled:opacity-50"
            >
              {t('launcher.feature_modal.assets.cancel', 'Cancel')}
            </button>
          </div>
          <div className="w-full bg-launcher-control h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-launcher-accent h-full transition-all duration-300"
              style={{ width: `${progress.percent ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[12px] text-launcher-textMuted">
            <span>{progress.message}</span>
            <span>{progress.speedText || progress.etaText ? `${progress.speedText ?? ''} ${progress.etaText ? `ETA ${progress.etaText}` : ''}` : `${progress.percent ?? 0}%`}</span>
          </div>
        </div>
      ) : isCompleted || isCancelled || isFailed ? (
        <div className={`w-full p-5 rounded-xl border flex flex-col items-center justify-center ${isFailed ? 'bg-red-600/20 border-red-500/20' : isCancelled ? 'bg-yellow-600/20 border-yellow-500/20' : 'bg-green-600/20 border-green-500/20'}`}>
          <span className={`font-bold ${isFailed ? 'text-red-300' : isCancelled ? 'text-yellow-300' : 'text-green-400'}`}>
            {isFailed
              ? t('launcher.feature_modal.assets.failed', 'Failed')
              : isCancelled
                ? t('launcher.feature_modal.assets.cancelled', 'Cancelled')
                : t('launcher.feature_modal.assets.completed', 'Completed')}
          </span>
          {(error || progress?.message || jobUrl) && (
            <p className="mt-2 text-center text-[13px] text-launcher-textMuted">{error ?? progress?.message ?? jobUrl}</p>
          )}
          <button onClick={reset} className="mt-2 text-launcher-textMuted text-sm hover:text-launcher-text">
            {t('launcher.feature_modal.assets.download_another', 'Download another')}
          </button>
        </div>
      ) : (
        <div className="flex gap-4 w-full">
          <button
            onClick={() => handleDownload('mp4')}
            disabled={!url}
            className="flex-1 py-4 bg-launcher-control hover:bg-launcher-controlHover disabled:opacity-50 disabled:cursor-not-allowed text-launcher-text rounded-xl transition-colors flex items-center justify-center gap-2 text-[14px] font-bold"
          >
            <Download size={18} /> {t('launcher.feature_modal.assets.download_mp4')}
          </button>
          <button
            onClick={() => handleDownload('mp3')}
            disabled={!url}
            className="flex-1 py-4 bg-launcher-accent hover:bg-launcher-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-[14px] font-bold"
          >
            <Download size={18} /> {t('launcher.feature_modal.assets.download_mp3')}
          </button>
        </div>
      )}
    </div>
  );
};
