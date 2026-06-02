import React, { useEffect, useState } from 'react';
import { Download, Search, ShieldAlert, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type MediaDownloadProgress } from '@shared/launcherTypes';
import { type TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { useUIStore } from '../../../shared/stores/uiStore';

type MediaDownloadPanelProps = {
  seriesId: TerminalSeriesId;
};

export const MediaDownloadPanel: React.FC<MediaDownloadPanelProps> = ({ seriesId }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [jobUrl, setJobUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<MediaDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const { series, setSelectedTab } = useTerminalSeriesStore();
  const { closeModal } = useUIStore();

  const currentSeries = series.find(s => s.id === seriesId);
  const isInstalled = currentSeries?.status === 'installed' || currentSeries?.status === 'running' || currentSeries?.status === 'update-available';

  useEffect(() => {
    const unsubscribe = window.launcher.mediaDownload.onProgress((event) => {
      setProgress(event);
      if (event.message) {
        const messageStr = event.message as string;
        setLogHistory(prev => {
          if (prev[prev.length - 1] === messageStr) return prev;
          const next = [...prev, messageStr];
          return next.slice(-50);
        });
      }
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
    setLogHistory([]);
  };

  const isActive = progress && ['pending', 'validating', 'running', 'postprocessing'].includes(progress.status);
  const isCompleted = progress?.status === 'completed';
  const isCancelled = progress?.status === 'cancelled';
  const isFailed = progress?.status === 'failed';

  if (!isInstalled) {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full space-y-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col items-center text-center gap-4 relative overflow-hidden group shadow-lg">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700 pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700 pointer-events-none" />

          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 border border-red-500/30">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2 relative z-10">
            <h4 className="text-[16px] font-black text-red-200 tracking-tight">
              {t('launcher.required', 'Required')}
            </h4>
            <p className="text-[13.5px] text-launcher-textMuted leading-relaxed max-w-md font-medium">
              {t('launcher.feature_modal.assets.install_required_warning')}
            </p>
          </div>

          <button
            onClick={() => {
              closeModal();
              setSelectedTab('overview');
            }}
            className="mt-2 px-6 py-2.5 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 hover:border-red-500/50 text-red-200 font-bold rounded-lg transition-all text-[13.5px] cursor-pointer flex items-center gap-2 shadow-inner font-semibold"
          >
            {t('launcher.feature_modal.assets.go_to_install')}
          </button>
        </div>
      </div>
    );
  }

  const getFriendlyLogMessage = (msg: string, status: string): string => {
    if (!msg) return '';
    const m = msg.toLowerCase();

    if (status === 'pending') {
      return t('launcher.feature_modal.assets.status_preparing', 'Preparing download...');
    }
    if (status === 'validating') {
      return t('launcher.feature_modal.assets.status_validating', 'Validating request and binaries...');
    }
    if (status === 'completed') {
      return t('launcher.feature_modal.assets.status_completed', 'Download & conversion completed');
    }
    if (status === 'cancelled') {
      return t('launcher.feature_modal.assets.status_cancelled', 'Download cancelled');
    }
    if (status === 'failed') {
      return t('launcher.feature_modal.assets.status_failed', 'Download failed');
    }

    if (m.includes('has already been downloaded')) {
      return t('launcher.feature_modal.assets.status_already_downloaded', 'Already downloaded.');
    }
    if (m.includes('destination:')) {
      return t('launcher.feature_modal.assets.status_preparing', 'Preparing download...');
    }
    if (m.startsWith('[download]')) {
      return t('launcher.feature_modal.assets.status_downloading', 'Downloading media...');
    }
    if (m.startsWith('[extractaudio]') || m.startsWith('[ffmpeg]') || m.includes('extracting audio')) {
      return t('launcher.feature_modal.assets.status_extracting_audio', 'Extracting and converting audio (ffmpeg)...');
    }
    if (m.startsWith('[merger]') || m.includes('merging media')) {
      return t('launcher.feature_modal.assets.status_merging', 'Merging media files (ffmpeg)...');
    }
    if (status === 'postprocessing') {
      return t('launcher.feature_modal.assets.status_postprocessing', 'Finalizing media post-processing...');
    }

    return msg;
  };

  return (
    <div id="media-download-panel" className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full space-y-5">
      <div className="relative flex items-center bg-launcher-control/50 rounded-lg border border-launcher-divider overflow-hidden">
        <div className="pl-4 text-launcher-textMuted">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder={t('launcher.feature_modal.assets.yt_placeholder')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full bg-transparent px-3 py-3 text-[14px] text-launcher-text font-medium outline-none placeholder:text-launcher-textMuted h-10"
        />
      </div>

      {isActive ? (
        <div className="w-full bg-launcher-surface/10 p-5 rounded-lg border border-launcher-divider flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-launcher-text text-[13.5px] font-semibold">
              {progress.status === 'postprocessing'
                ? t('launcher.feature_modal.assets.postprocessing', 'Post-processing...')
                : progress.status === 'validating'
                  ? t('launcher.feature_modal.assets.validating', 'Validating...')
                  : t('launcher.feature_modal.assets.downloading', 'Downloading...')}
            </span>
            <button
              onClick={() => handleCancel(progress.jobId)}
              disabled={progress.jobId === 'pending'}
              className="text-red-400 text-[13px] font-bold hover:text-red-300 disabled:opacity-50 cursor-pointer"
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
          <div className="flex justify-between text-[12.5px] font-medium leading-relaxed">
            <span className="text-launcher-text/90 font-semibold">{getFriendlyLogMessage(progress.message ?? '', progress.status)}</span>
            <span className="text-launcher-textMuted font-mono text-[12px]">{progress.speedText || progress.etaText ? `${progress.speedText ?? ''} ${progress.etaText ? `ETA ${progress.etaText}` : ''}` : `${progress.percent ?? 0}%`}</span>
          </div>

          {/* Technical Logs Toggle */}
          <div className="mt-2 pt-2.5 border-t border-launcher-divider/40">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-[11px] text-launcher-textMuted hover:text-launcher-text font-bold transition-colors cursor-pointer"
            >
              <Terminal size={13} />
              <span>{t('launcher.feature_modal.assets.technical_logs')}</span>
              {showLogs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showLogs && (
              <div className="mt-2 bg-black/60 border border-launcher-divider/40 rounded-lg p-3 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 font-mono text-[11px] text-launcher-accent/80 space-y-1 select-text">
                {logHistory.length === 0 ? (
                  <div className="text-white/40 italic">Waiting for terminal logs...</div>
                ) : (
                  logHistory.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed truncate">
                      {line}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : isCompleted || isCancelled || isFailed ? (
        <div className={`w-full p-5 rounded-lg border flex flex-col items-center justify-center ${
          isFailed 
            ? 'bg-red-600/10 border-red-500/20 text-red-400' 
            : isCancelled 
              ? 'bg-yellow-600/10 border-yellow-500/20 text-yellow-400' 
              : 'bg-green-600/10 border-green-500/20 text-green-400'
        }`}>
          <span className="font-semibold text-[13.5px]">
            {isFailed
              ? t('launcher.feature_modal.assets.failed', 'Failed')
              : isCancelled
                ? t('launcher.feature_modal.assets.cancelled', 'Cancelled')
                : t('launcher.feature_modal.assets.completed', 'Completed')}
          </span>
          {(error || progress?.message || jobUrl) && (
            <p className="mt-2 text-center text-[12.5px] text-launcher-textMuted font-mono">
              {isFailed 
                ? (error === 'Install path not set' 
                    ? t('launcher.feature_modal.launcher.install_path_desc')
                    : error ?? progress?.message)
                : getFriendlyLogMessage(progress?.message ?? '', progress?.status ?? '') || jobUrl}
            </p>
          )}

          {/* Technical Logs Toggle inside Completed/Failed State */}
          <div className="mt-3 pt-3 border-t border-launcher-divider/30 w-full flex flex-col items-center">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-[11px] text-launcher-textMuted hover:text-launcher-text font-bold transition-colors cursor-pointer"
            >
              <Terminal size={13} />
              <span>{t('launcher.feature_modal.assets.technical_logs')}</span>
              {showLogs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showLogs && (
              <div className="mt-2 bg-black/60 border border-launcher-divider/40 rounded-lg p-3 max-h-[140px] w-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 font-mono text-[11px] text-launcher-accent/80 space-y-1 select-text text-left">
                {logHistory.length === 0 ? (
                  <div className="text-white/40 italic">No logs recorded.</div>
                ) : (
                  logHistory.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed truncate">
                      {line}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button onClick={reset} className="mt-4 text-launcher-textMuted text-[13px] hover:text-launcher-text cursor-pointer">
            {t('launcher.feature_modal.assets.download_another', 'Download another')}
          </button>
        </div>
      ) : (
        <div className="flex gap-3 w-full">
          <button
            onClick={() => handleDownload('mp4')}
            disabled={!url}
            className="flex-1 py-2 bg-launcher-surface hover:bg-launcher-controlHover border border-launcher-divider disabled:opacity-50 disabled:cursor-not-allowed text-launcher-text rounded-lg transition-colors flex items-center justify-center gap-2 text-[13px] font-semibold cursor-pointer h-10"
          >
            <Download size={16} /> {t('launcher.feature_modal.assets.download_mp4')}
          </button>
          <button
            onClick={() => handleDownload('mp3')}
            disabled={!url}
            className="flex-1 py-2 bg-launcher-accent hover:bg-launcher-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-[13px] font-semibold cursor-pointer h-10"
          >
            <Download size={16} /> {t('launcher.feature_modal.assets.download_mp3')}
          </button>
        </div>
      )}
    </div>
  );
};
