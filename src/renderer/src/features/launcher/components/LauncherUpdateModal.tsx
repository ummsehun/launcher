import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clipboard, Download, Loader2, RefreshCw, RotateCw, X } from 'lucide-react';
import { type LauncherUpdateState } from '@shared/launcherTypes';

const formatBytes = (value?: number): string => {
  if (!value || value <= 0) {
    return '0 MB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const shouldOpenModal = (state: LauncherUpdateState): boolean =>
  state.status === 'available' ||
  state.status === 'downloading' ||
  state.status === 'downloaded' ||
  state.status === 'error';

const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

export const LauncherUpdateModal: React.FC = () => {
  const [updateState, setUpdateState] = useState<LauncherUpdateState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void window.launcher.updates.getStatus().then((result) => {
      if (!isMounted || !result.ok) {
        return;
      }

      setUpdateState(result.data);
      setIsOpen(shouldOpenModal(result.data));
    });

    const unsubscribe = window.launcher.updates.onStatusChanged((state) => {
      setUpdateState(state);
      if (shouldOpenModal(state)) {
        setIsOpen(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const progress = Math.max(0, Math.min(100, updateState?.percent ?? 0));
  const version = updateState?.update?.version ?? '새 버전';
  const canClose = updateState?.status === 'available' || updateState?.status === 'error' || updateState?.status === 'not-available';

  const copy = useMemo(() => {
    switch (updateState?.status) {
      case 'available':
        return {
          icon: Download,
          title: '런처 업데이트가 준비되었습니다',
          description: `TermPlay ${version} 버전을 다운로드할 수 있습니다.`,
          action: '업데이트 다운로드',
        };
      case 'downloading':
        return {
          icon: Loader2,
          title: '런처 업데이트 다운로드 중',
          description: `${formatBytes(updateState.transferred)} / ${formatBytes(updateState.total)}`,
          action: '다운로드 중',
        };
      case 'downloaded':
        return {
          icon: CheckCircle2,
          title: '업데이트 다운로드 완료',
          description: '런처를 재시작하면 새 버전이 설치됩니다.',
          action: '재시작 후 설치',
        };
      case 'error':
        return {
          icon: AlertCircle,
          title: '업데이트 확인 실패',
          description: updateState.message ?? updateState.error ?? '업데이트 서버에 연결하지 못했습니다.',
          action: '다시 확인',
        };
      default:
        return {
          icon: RefreshCw,
          title: '런처 업데이트',
          description: '업데이트 상태를 확인하고 있습니다.',
          action: '확인',
        };
    }
  }, [updateState, version]);

  if (!isOpen || !updateState) {
    return null;
  }

  const Icon = copy.icon;
  const detailText = updateState.detail ?? updateState.error ?? updateState.message ?? '';

  const handlePrimaryAction = async () => {
    setIsWorking(true);
    try {
      if (updateState.status === 'available') {
        const result = await window.launcher.updates.download();
        if (!result.ok) {
          setUpdateState((state) => state ? { ...state, status: 'error', error: result.error } : state);
        }
      } else if (updateState.status === 'downloaded') {
        await window.launcher.updates.install();
      } else if (updateState.status === 'error') {
        const result = await window.launcher.updates.check();
        if (!result.ok) {
          setUpdateState((state) => state ? { ...state, status: 'error', error: result.error } : state);
        }
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="theme-app fixed inset-0 z-[120] flex items-center justify-center bg-launcher-overlay px-6">
      <div className="theme-panel-strong relative w-full max-w-[440px] overflow-hidden rounded-2xl border shadow-2xl">
        {canClose && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="닫기"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-launcher-control text-launcher-textMuted transition-colors hover:bg-launcher-controlHover hover:text-launcher-text"
          >
            <X size={16} />
          </button>
        )}

        <div className="px-7 pb-7 pt-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-launcher-accent/12 text-launcher-accent">
              <Icon className={updateState.status === 'downloading' ? 'animate-spin' : ''} size={30} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-launcher-textMuted">TermPlay Update</p>
            <h2 className="mt-2 text-[22px] font-bold leading-tight text-launcher-text">{copy.title}</h2>
            <p className="mt-3 max-w-[340px] text-[14px] leading-6 text-launcher-textMuted">{copy.description}</p>
          </div>

          {(updateState.status === 'downloading' || updateState.status === 'downloaded') && (
            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-launcher-textMuted">
                <span>{Math.round(progress)}%</span>
                {updateState.bytesPerSecond ? <span>{formatBytes(updateState.bytesPerSecond)}/s</span> : null}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-launcher-control">
                <div
                  className="h-full rounded-full bg-launcher-accent transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {updateState.status === 'error' && detailText && (
            <div className="mb-6 rounded-xl border border-launcher-divider bg-launcher-control/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowDetail((value) => !value)}
                  className="text-[13px] font-semibold text-launcher-textMuted hover:text-launcher-text"
                >
                  {showDetail ? '세부 정보 숨기기' : '세부 정보 보기'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(detailText)}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-launcher-border px-3 text-[12px] font-semibold text-launcher-textMuted hover:bg-launcher-controlHover hover:text-launcher-text"
                >
                  <Clipboard size={13} />
                  복사
                </button>
              </div>
              {showDetail && (
                <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-launcher-bg/50 p-3 text-left text-[11px] leading-5 text-launcher-textMuted select-text">
                  {detailText}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {canClose && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-11 rounded-xl border border-launcher-border px-5 text-[14px] font-semibold text-launcher-textMuted transition-colors hover:bg-launcher-control hover:text-launcher-text"
              >
                나중에
              </button>
            )}
            <button
              type="button"
              onClick={() => void handlePrimaryAction()}
              disabled={isWorking || updateState.status === 'downloading'}
              className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-launcher-accent px-5 text-[14px] font-bold text-white shadow-lg shadow-blue-950/20 transition-colors hover:bg-launcher-accentHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(isWorking || updateState.status === 'downloading') && <Loader2 className="animate-spin" size={16} />}
              {updateState.status === 'downloaded' && <RotateCw size={16} />}
              {copy.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
