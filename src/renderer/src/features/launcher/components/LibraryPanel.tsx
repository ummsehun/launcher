import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig, TerminalSeriesId, LibraryDirKey } from '../../terminal-series/constants/seriesFeatureConfig';
import { DirSummary, FileInfo } from '@shared/launcherTypes';
import { Folder, File, FolderOpen, RefreshCw, AlertTriangle } from 'lucide-react';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(timestamp));
};

export const LibraryPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId } = useTerminalSeriesStore();
  const config = getSeriesFeatureConfig(selectedSeriesId);
  const [selectedDir, setSelectedDir] = useState<LibraryDirKey | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [summaries, setSummaries] = useState<DirSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config?.libraryDirs && config.libraryDirs.length > 0 && !selectedDir) {
      setSelectedDir(config.libraryDirs[0].key);
    }
  }, [config, selectedDir]);

  const loadSummaries = async () => {
    if (selectedSeriesId) {
      const result = await window.launcher.library.getDirSummary(selectedSeriesId as TerminalSeriesId);
      if (result.ok) {
        setSummaries(result.data);
      }
    }
  };

  const loadFiles = async (dir: LibraryDirKey) => {
    if (!selectedSeriesId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.launcher.library.readDir(selectedSeriesId as TerminalSeriesId, dir);
      if (result.ok) {
        setFiles(result.data);
      } else {
        setError(result.error);
        setFiles([]);
      }
    } catch (e: any) {
      setError(e.message);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, [selectedSeriesId]);

  useEffect(() => {
    if (selectedDir) {
      loadFiles(selectedDir);
    }
  }, [selectedDir, selectedSeriesId]);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-launcher-bg text-launcher-textMuted">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const handleOpenNativeDir = async () => {
    if (!selectedDir) return;
    const result = await window.launcher.library.openDir(selectedSeriesId as TerminalSeriesId, selectedDir);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    loadFiles(selectedDir);
    loadSummaries();
  };

  const isGascii = selectedSeriesId === 'gascii';
  const hasEmptyGasciiAssetDir = isGascii && summaries.some((summary) => !summary.exists || summary.fileCount === 0);

  return (
    <div className="flex h-full bg-launcher-bg text-launcher-text overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-launcher-divider flex flex-col bg-launcher-surface/40">
        <div className="p-6 pb-4">
          <h2 className="text-[17px] font-bold text-launcher-text">{t('launcher.feature_modal.library.title', 'Library')}</h2>
          <p className="text-[13px] text-launcher-textMuted mt-1">{t('launcher.feature_modal.library.desc', 'Manage your media files')}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-none">
          {config.libraryDirs.map((dir, idx) => {
            const isSelected = selectedDir === dir.key;
            const summary = summaries.find(s => s.dirKey === dir.key);
            return (
              <button 
                key={idx} 
                onClick={() => setSelectedDir(dir.key)}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-colors group cursor-pointer ${
                  isSelected ? 'bg-launcher-accent/10 text-launcher-accent' : 'text-launcher-textMuted hover:bg-launcher-control/50 hover:text-launcher-text'
                }`}
              >
                <div className={`mr-3 transition-colors ${
                  isSelected ? 'text-launcher-accent' : 'text-launcher-textMuted group-hover:text-launcher-accent'
                }`}>
                  <dir.icon size={17} />
                </div>
                <div className="flex flex-col items-start flex-1 text-left">
                  <span className={`text-[13.5px] font-medium transition-colors ${isSelected ? 'text-launcher-accent font-semibold' : 'text-launcher-textMuted group-hover:text-launcher-text'}`}>
                    {dir.key.charAt(0).toUpperCase() + dir.key.slice(1)}
                  </span>
                </div>
                {summary && summary.fileCount > 0 && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    isSelected ? 'bg-launcher-accent/20 text-launcher-accent' : 'bg-launcher-control text-launcher-textMuted group-hover:bg-launcher-controlHover'
                  }`}>
                    {summary.fileCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-launcher-bg">
        {/* Top bar */}
        <div className="h-[68px] border-b border-launcher-divider flex items-center justify-between pl-8 pr-20 bg-launcher-panel/40 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] font-bold text-launcher-text flex items-center gap-3">
              {selectedDir ? selectedDir.charAt(0).toUpperCase() + selectedDir.slice(1) : 'Directory'}
            </h3>
            <div className="h-3 w-[1px] bg-launcher-divider"></div>
            <span className="text-[12.5px] text-launcher-textMuted font-medium">
              {files.length} {t('launcher.feature_modal.library.items', 'items')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => selectedDir && loadFiles(selectedDir)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-launcher-surface border border-launcher-divider hover:bg-launcher-controlHover text-launcher-textMuted hover:text-launcher-text transition-colors cursor-pointer"
              title={t('launcher.feature_modal.library.refresh', 'Refresh')}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handleOpenNativeDir}
              className="flex items-center gap-2 px-4 py-1.5 h-9 rounded-lg bg-launcher-accent hover:bg-launcher-accentHover text-white transition-colors text-[13px] font-semibold cursor-pointer"
            >
              <FolderOpen size={14} />
              {t('launcher.feature_modal.library.open_dir', 'Open / Add Files')}
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-none relative">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-[13px] text-red-200 flex items-start gap-3 shadow-lg">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-400" />
              <p>{error}</p>
            </div>
          )}
          
          {hasEmptyGasciiAssetDir && selectedDir === 'video' && files.length === 0 && (
            <div className="mb-6 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-transparent p-5 flex items-start gap-4 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-yellow-300 tracking-wide">
                  {t('launcher.feature_modal.library.gascii_assets_required', 'Assets Required')}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-yellow-100/70">
                  {t('launcher.feature_modal.library.gascii_assets_required_desc', 'Please add video/audio files to use Gascii features.')}
                </p>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-launcher-bg/50 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw size={32} className="animate-spin text-launcher-accent" />
                <span className="text-[14px] text-launcher-textMuted tracking-widest uppercase text-xs font-bold">Loading...</span>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div id="library-empty-state" className="h-full flex items-center justify-center text-launcher-textMuted">
              <div className="flex flex-col items-center text-center gap-6 max-w-[320px] p-10 rounded-2xl border border-dashed border-launcher-divider bg-launcher-surface/20">
                <div className="w-16 h-16 rounded-xl bg-launcher-surface/50 flex items-center justify-center text-launcher-textMuted border border-launcher-divider">
                  <FolderOpen size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-launcher-text tracking-wide mb-2">{t('launcher.feature_modal.library.empty_dir', 'Folder is empty')}</h4>
                  <p className="text-[13.5px] leading-relaxed text-launcher-textMuted">
                    {t('launcher.feature_modal.library.empty_dir_desc', 'Click the Open / Add Files button to add content to this directory.')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div id="library-table-container" className="bg-launcher-surface/10 rounded-xl border border-launcher-divider overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-launcher-divider bg-transparent">
                    <th className="py-3 px-6 text-[12px] font-semibold text-launcher-textMuted tracking-normal w-[50%]">{t('launcher.feature_modal.library.name', 'Name')}</th>
                    <th className="py-3 px-6 text-[12px] font-semibold text-launcher-textMuted tracking-normal w-[25%]">{t('launcher.feature_modal.library.date_modified', 'Date Modified')}</th>
                    <th className="py-3 px-6 text-[12px] font-semibold text-launcher-textMuted tracking-normal text-right w-[25%]">{t('launcher.feature_modal.library.size', 'Size')}</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file, idx) => (
                    <tr key={idx} className="border-b border-launcher-divider/50 hover:bg-white/[0.03] transition-colors group">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="flex items-center justify-center shrink-0">
                            {file.isDirectory ? (
                              <Folder size={18} className="text-sky-400 fill-sky-400/10" />
                            ) : (
                              <File size={18} className="text-slate-400" />
                            )}
                          </div>
                          <span className="text-[14px] text-launcher-text truncate font-normal block">{file.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-[13px] text-launcher-textMuted whitespace-nowrap">
                        {formatDate(file.lastModified)}
                      </td>
                      <td className="py-3 px-6 text-[13px] text-launcher-textMuted text-right whitespace-nowrap font-mono">
                        {file.isDirectory ? '--' : formatBytes(file.sizeBytes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
