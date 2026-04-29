import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { SelectInstallPathResponse, SetSeriesOptionRequest, SetSeriesOptionResponse } from '@shared/launcherTypes';

const logger = createLogger('launcher-handler');

export const registerLauncherHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.launcher.selectInstallPath, async (): Promise<SelectInstallPathResponse> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, error: 'User canceled' };
      }

      return {
        ok: true,
        data: { path: result.filePaths[0] }
      };
    } catch (error: any) {
      logger.error('selectInstallPath failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setSeriesOption, async (_event, request: SetSeriesOptionRequest): Promise<SetSeriesOptionResponse> => {
    try {
      // Phase 6 will implement actual saving to a local JSON or electron-store.
      // For now, mock a successful save.
      logger.info(`setSeriesOption: [${request.seriesId}] ${request.key} = ${request.value}`);
      return {
        ok: true,
        data: request,
      };
    } catch (error: any) {
      logger.error('setSeriesOption failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.openLibraryDir, async (_event, payload: { seriesId: string; dir: string }) => {
    logger.info(`openLibraryDir: ${payload.seriesId} -> ${payload.dir}`);
    // Scaffold: will use shell.openPath()
  });

  ipcMain.handle(IPC_CHANNELS.launcher.downloadAsset, async (_event, payload: { assetId: string }) => {
    logger.info(`downloadAsset: ${payload.assetId}`);
    // Scaffold: will initiate download logic and emit onDownloadProgress
  });
};
