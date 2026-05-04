import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { createLogger } from '@shared/logger';
import { IPC_CHANNELS } from '@shared/ipc';
import type { LauncherUpdateInfo, LauncherUpdateState, Result } from '@shared/launcherTypes';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';

const logger = createLogger('auto-update');
const updateFeed = {
  provider: 'github' as const,
  owner: 'ummsehun',
  repo: 'launcher',
};

let currentState: LauncherUpdateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
};

let didRegisterUpdateHandlers = false;

const toUpdateInfo = (info: { version?: string; releaseDate?: string; releaseName?: string | null }): LauncherUpdateInfo => ({
  version: info.version,
  releaseDate: info.releaseDate,
  releaseName: info.releaseName ?? undefined,
});

const publishState = (state: Partial<LauncherUpdateState>): LauncherUpdateState => {
  currentState = {
    ...currentState,
    ...state,
    currentVersion: app.getVersion(),
  };

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.launcher.updateStatusChanged, currentState);
  }

  return currentState;
};

const runUpdateCheck = async (): Promise<Result<LauncherUpdateState>> => {
  if (!app.isPackaged) {
    const state = publishState({
      status: 'error',
      message: 'Packaged app에서만 업데이트를 확인할 수 있습니다.',
      error: 'Update checks are disabled outside packaged apps.',
    });
    return { ok: false, error: state.error ?? 'Update checks are disabled outside packaged apps.' };
  }

  try {
    publishState({ status: 'checking', message: '업데이트를 확인하는 중입니다.', error: undefined });
    await autoUpdater.checkForUpdates();
    return { ok: true, data: currentState };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const message = toUserFacingUpdateError(detail);
    publishState({ status: 'error', message, error: message, detail });
    return { ok: false, error: message };
  }
};

const toUserFacingUpdateError = (detail: string): string => {
  if (detail.includes('latest-mac.yml') && detail.includes('404')) {
    return 'macOS 업데이트 메타데이터가 현재 릴리스에 없습니다. 새 릴리스가 macOS 산출물과 함께 배포되어야 합니다.';
  }

  if (detail.includes('latest.yml') && detail.includes('404')) {
    return '업데이트 메타데이터가 현재 릴리스에 없습니다. 릴리스 산출물을 다시 확인해야 합니다.';
  }

  return '런처 업데이트를 확인하지 못했습니다.';
};

export const registerAutoUpdateHandlers = (): void => {
  if (didRegisterUpdateHandlers) {
    return;
  }

  didRegisterUpdateHandlers = true;

  ipcMain.handle(IPC_CHANNELS.launcher.updateGetStatus, async (): Promise<Result<LauncherUpdateState>> => ({
    ok: true,
    data: currentState,
  }));

  ipcMain.handle(IPC_CHANNELS.launcher.updateCheck, async (): Promise<Result<LauncherUpdateState>> => runUpdateCheck());

  ipcMain.handle(IPC_CHANNELS.launcher.updateDownload, async (): Promise<Result<LauncherUpdateState>> => {
    if (!app.isPackaged) {
      return { ok: false, error: 'Update downloads are disabled outside packaged apps.' };
    }

    try {
      publishState({ status: 'downloading', percent: 0, message: '업데이트를 다운로드하는 중입니다.', error: undefined });
      await autoUpdater.downloadUpdate();
      return { ok: true, data: currentState };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const message = '업데이트 다운로드에 실패했습니다.';
      publishState({ status: 'error', message, error: message, detail });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.updateInstall, async (): Promise<Result<null>> => {
    if (currentState.status !== 'downloaded') {
      return { ok: false, error: 'Downloaded update is not ready.' };
    }

    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });

    return { ok: true, data: null };
  });
};

export const initializeAutoUpdate = (): void => {
  if (!app.isPackaged) {
    logger.info('skipped auto update check outside packaged app');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL(updateFeed);

  autoUpdater.on('checking-for-update', () => {
    logger.info('checking for update');
    publishState({ status: 'checking', message: '업데이트를 확인하는 중입니다.', error: undefined });
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('update available', { version: info.version });
    publishState({
      status: 'available',
      update: toUpdateInfo(info),
      percent: undefined,
      transferred: undefined,
      total: undefined,
      bytesPerSecond: undefined,
      message: `새 런처 버전 ${info.version}을 사용할 수 있습니다.`,
      error: undefined,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('update not available', { version: info.version });
    publishState({
      status: 'not-available',
      update: toUpdateInfo(info),
      message: '현재 최신 버전입니다.',
      error: undefined,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    logger.info('update download progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
    publishState({
      status: 'downloading',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
      message: '업데이트를 다운로드하는 중입니다.',
      error: undefined,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('update downloaded; waiting for restart confirmation', { version: info.version });
    publishState({
      status: 'downloaded',
      update: toUpdateInfo(info),
      percent: 100,
      message: '업데이트 다운로드가 완료되었습니다. 재시작하면 설치됩니다.',
      error: undefined,
    });
  });

  autoUpdater.on('error', (error) => {
    logger.warn('auto update failed', { message: error.message });
    const message = toUserFacingUpdateError(error.message);
    publishState({ status: 'error', message, error: message, detail: error.message });
  });

  void launcherConfigRepo.getConfig()
    .then((config) => {
      if (!config.global.autoUpdate) {
        logger.info('skipped auto update check by user setting');
        return;
      }

      void runUpdateCheck();
    })
    .catch((error: unknown) => {
      logger.warn('auto update check failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    });
};
