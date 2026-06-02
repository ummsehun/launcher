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
          badge: 'UPDATE AVAILABLE',
          title: 'TermPlay 신규 업데이트',
          description: `TermPlay ${version} 버전을 다운로드할 수 있습니다.`,
          action: '업데이트 다운로드',
        };
      case 'downloading':
        return {
          icon: Loader2,
          badge: 'DOWNLOADING',
          title: '런처 업데이트 패치 진행 중',
          description: '신버전의 패키지 파일을 안전하게 다운로드하고 있습니다.',
          action: '다운로드 중',
        };
      case 'downloaded':
        return {
          icon: CheckCircle2,
          badge: 'DOWNLOAD COMPLETED',
          title: '패키지 준비 완료',
          description: '런처를 재시작하면 최신 패치가 자동으로 설치됩니다.',
          action: '재시작 후 설치',
        };
      case 'error':
        return {
          icon: AlertCircle,
          badge: 'UPDATE FAILED',
          title: '업데이트 확인 실패',
          description: updateState.message ?? updateState.error ?? '업데이트 서버 연결에 실패했습니다.',
          action: '다시 확인',
        };
      default:
        return {
          icon: RefreshCw,
          badge: 'CHECKING STATUS',
          title: '런처 업데이트 확인',
          description: '업데이트 상태 및 파일 무결성을 점검하고 있습니다.',
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
    <div className="bg-launcher-bg text-launcher-text fixed inset-0 z-[120] flex items-center justify-center bg-launcher-overlay/85 backdrop-blur-sm px-6">
      {/* Premium offset desktop design with ambient glow */}
      <div className="bg-launcher-panelStrongBg/90 border border-white/10 text-launcher-text relative w-full max-w-[480px] overflow-hidden rounded-2xl shadow-2xl backdrop-blur-2xl shadow-launcher-accent/5">
        {/* Top accent gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-launcher-accent via-indigo-500 to-sky-400" />

        {canClose && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="닫기"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-launcher-control hover:bg-launcher-controlHover text-launcher-textMuted transition-all hover:text-launcher-text cursor-pointer border border-white/5"
          >
            <X size={14} />
          </button>
        )}

        <div className="px-8 pb-7 pt-8">
          <div className="mb-6 flex flex-col items-start text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-launcher-accent/15 text-launcher-accent border border-launcher-accent/25">
                <Icon className={updateState.status === 'downloading' ? 'animate-spin' : ''} size={18} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-launcher-accent font-mono bg-launcher-accent/10 px-2.5 py-0.5 rounded-full border border-launcher-accent/20">
                {copy.badge}
              </span>
            </div>
            
            <h2 className="mt-4 text-[24px] font-black leading-none text-launcher-text italic tracking-tight uppercase">
              TermPlay <span className="text-transparent bg-clip-text bg-gradient-to-r from-launcher-accent to-sky-400">{version}</span>
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-launcher-textMuted font-medium">
              {copy.description}
            </p>
          </div>

          {/* Available Changelog details */}
          {updateState.status === 'available' && (
            <div className="mb-6 bg-white/[0.015] border border-white/5 rounded-xl p-4 space-y-2.5">
              <h4 className="text-[11.5px] font-extrabold tracking-wider text-launcher-textMuted uppercase font-mono">주요 패치 내역 및 개선 사항</h4>
              <ul className="space-y-2 text-[12.5px] text-launcher-text/90 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-launcher-accent mt-0.5 font-black">✓</span>
                  <span><strong>코어 엔진 고도화</strong>: 터미널 디스플레이 렌더링 프레임워크 최적화</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-launcher-accent mt-0.5 font-black">✓</span>
                  <span><strong>macOS 안정성 향상</strong>: 게이트키퍼 보안 정책 충돌 문제 해결</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-launcher-accent mt-0.5 font-black">✓</span>
                  <span><strong>기타 편의성 보강</strong>: UI 디테일 조정 및 오버레이 예외 처리 강화</span>
                </li>
              </ul>
            </div>
          )}

          {/* Downloading state with modern animated bar */}
          {(updateState.status === 'downloading' || updateState.status === 'downloaded') && (
            <div className="mb-6 bg-white/[0.015] border border-white/5 rounded-xl p-4">
              <div className="mb-2.5 flex items-center justify-between text-[12px] font-bold text-launcher-textMuted font-mono">
                <span className="text-launcher-accent font-extrabold">{Math.round(progress)}%</span>
                {updateState.bytesPerSecond ? <span>{formatBytes(updateState.bytesPerSecond)}/s</span> : null}
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-launcher-control border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-launcher-accent via-indigo-500 to-sky-400 transition-[width] duration-300 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] bg-[length:200px_100%] animate-pulse" />
                </div>
              </div>
              <div className="mt-2.5 flex justify-between text-[11px] font-semibold text-launcher-textMuted font-mono">
                <span>{formatBytes(updateState.transferred)}</span>
                <span>총 {formatBytes(updateState.total)}</span>
              </div>
            </div>
          )}

          {/* Download Completed visual confirmation */}
          {updateState.status === 'downloaded' && (
            <div className="mb-6 bg-launcher-accent/5 border border-launcher-accent/15 rounded-xl p-4 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-launcher-accent/10 flex items-center justify-center text-launcher-accent border border-launcher-accent/20 animate-bounce">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-[13.5px] font-bold text-launcher-accent">다운로드가 완료되었습니다</h4>
                <p className="mt-1 text-[12px] text-launcher-textMuted leading-relaxed max-w-xs">
                  앱 재시작 시 즉시 최신 패치가 자동 설치되며 실행을 이어나갈 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* Error and Log detail sections */}
          {updateState.status === 'error' && (
            <div className="mb-6 bg-red-500/5 border border-red-500/15 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-[13.5px]">
                <AlertCircle size={16} />
                <span>업데이트 중 오류가 발생했습니다</span>
              </div>
              <p className="text-[12.5px] text-launcher-textMuted leading-relaxed">
                {updateState.message ?? updateState.error ?? '업데이트 서버와의 연결이 불안정합니다. 로그를 복사해 지원 센터에 문의해 주세요.'}
              </p>
              
              {detailText && (
                <div className="mt-1 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDetail((value) => !value)}
                      className="text-[12px] font-bold text-launcher-textMuted hover:text-launcher-text font-mono cursor-pointer"
                    >
                      {showDetail ? '세부 정보 숨기기 ▴' : '세부 정보 보기 ▾'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText(detailText)}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] font-bold text-launcher-textMuted hover:bg-launcher-controlHover hover:text-launcher-text transition-colors cursor-pointer"
                    >
                      <Clipboard size={12} />
                      로그 복사
                    </button>
                  </div>
                  {showDetail && (
                    <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 border border-white/5 p-3 text-left font-mono text-[10.5px] leading-relaxed text-launcher-accent/80 select-text scrollbar-thin">
                      {detailText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3.5">
            {canClose && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-10 rounded-xl border border-white/10 hover:border-white/20 bg-launcher-surface/20 px-5 text-[13.5px] font-bold text-launcher-textMuted transition-all hover:bg-launcher-control hover:text-launcher-text cursor-pointer"
              >
                나중에
              </button>
            )}
            <button
              type="button"
              onClick={() => void handlePrimaryAction()}
              disabled={isWorking || updateState.status === 'downloading'}
              className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-launcher-accent hover:bg-launcher-accentHover px-5 text-[13.5px] font-black text-white shadow-lg shadow-launcher-accent/20 transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {(isWorking || updateState.status === 'downloading') && <Loader2 className="animate-spin" size={14} />}
              {updateState.status === 'downloaded' && <RotateCw size={14} />}
              <span>{copy.action}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
