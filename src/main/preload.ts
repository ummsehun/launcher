import { contextBridge, ipcRenderer } from 'electron';
import { gameIdSchema, type GameId } from '@shared/games';
import { IPC_CHANNELS } from '@shared/ipc';
import { TerminalSeriesId, LauncherSettingKey } from '@shared/launcherTypes';

contextBridge.exposeInMainWorld('launcher', {
  game: {
    launch: (gameId: GameId) => ipcRenderer.invoke(IPC_CHANNELS.launchGame, gameIdSchema.parse(gameId)),
    onStatusChanged: (callback: (event: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.gameStatusChanged, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.gameStatusChanged, listener);
      };
    },
  },
  settings: {
    selectInstallPath: () => ipcRenderer.invoke(IPC_CHANNELS.launcher.selectInstallPath),
    setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => 
      ipcRenderer.invoke(IPC_CHANNELS.launcher.setSeriesOption, { seriesId, key, value }),
  },
  library: {
    openDir: (seriesId: string, dir: string) => ipcRenderer.invoke(IPC_CHANNELS.launcher.openLibraryDir, { seriesId, dir }),
  },
  assets: {
    download: (assetId: string) => ipcRenderer.invoke(IPC_CHANNELS.launcher.downloadAsset, { assetId }),
    onProgress: (callback: (event: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.launcher.onDownloadProgress, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.launcher.onDownloadProgress, listener);
      };
    }
  }
});
