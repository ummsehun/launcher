import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { createLogger } from '@shared/logger';

const logger = createLogger('auto-update');

export const initializeAutoUpdate = (): void => {
  if (!app.isPackaged) {
    logger.info('skipped auto update check outside packaged app');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    logger.info('checking for update');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('update available', { version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('update not available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    logger.info('update download progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('update downloaded; it will install on app quit', { version: info.version });
  });

  autoUpdater.on('error', (error) => {
    logger.warn('auto update failed', { message: error.message });
  });

  void autoUpdater.checkForUpdatesAndNotify().catch((error: unknown) => {
    logger.warn('auto update check failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  });
};
