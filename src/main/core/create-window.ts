import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, nativeTheme } from 'electron';
import { configureWindowSecurity, isAllowedDevRendererUrl, normalizeDevRendererUrl } from './window-security';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const createMainWindow = (): BrowserWindow => {
  // Sync native OS theme settings with saved config on launch to color-match the native windowBar
  void launcherConfigRepo.getConfig().then((config) => {
    nativeTheme.themeSource = config.global.theme || 'system';
  });

  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    title: 'TermPlay',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#09090b' : '#f7f7f8',
    webPreferences: {
      preload: join(currentDirectory, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  configureWindowSecurity(mainWindow);

  if (process.env.ELECTRON_RENDERER_URL && isAllowedDevRendererUrl(process.env.ELECTRON_RENDERER_URL)) {
    void mainWindow.loadURL(normalizeDevRendererUrl(process.env.ELECTRON_RENDERER_URL));
  } else {
    void mainWindow.loadFile(join(currentDirectory, '../renderer/index.html'));
  }

  return mainWindow;
};
