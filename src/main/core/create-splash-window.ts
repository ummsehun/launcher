import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, nativeTheme, screen, type Event } from 'electron';
import { configureWindowSecurity, isAllowedDevRendererUrl } from './window-security';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const createSplashWindow = (): BrowserWindow => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  const splashWindow = new BrowserWindow({
    x,
    y,
    width,
    height,

    // macOS native fullscreen이 아니라 borderless pseudo fullscreen
    frame: false,
    fullscreen: false,
    fullscreenable: false,

    resizable: false,
    maximizable: false,
    title: 'TermPlay',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#050505' : '#ffffff',
    show: false,

    webPreferences: {
      preload: join(currentDirectory, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  configureWindowSecurity(splashWindow);

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  if (process.env.ELECTRON_RENDERER_URL && isAllowedDevRendererUrl(process.env.ELECTRON_RENDERER_URL)) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL);
    url.searchParams.set('view', 'splash');
    void splashWindow.loadURL(url.toString());
  } else {
    void splashWindow.loadFile(join(currentDirectory, '../renderer/index.html'), {
      query: { view: 'splash' },
    });
  }

  return splashWindow;
};

export const waitForSplashWindowReady = async (splashWindow: BrowserWindow): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    let didSettle = false;

    const settle = (callback: () => void) => {
      if (didSettle) {
        return;
      }

      didSettle = true;
      callback();
    };

    const cleanup = () => {
      splashWindow.webContents.off('did-finish-load', onLoad);
      splashWindow.webContents.off('did-fail-load', onFail);
      splashWindow.off('ready-to-show', onReadyToShow);
      splashWindow.off('closed', onClosed);
    };

    const onLoad = () => {
      if (splashWindow.isVisible()) {
        settle(() => {
          cleanup();
          resolve();
        });
      }
    };

    const onReadyToShow = () => {
      if (!splashWindow.webContents.isLoading()) {
        settle(() => {
          cleanup();
          resolve();
        });
      }
    };

    const onFail = (_event: Event, _errorCode: number, errorDescription: string) => {
      settle(() => {
        cleanup();
        reject(new Error(`Splash load failed: ${errorDescription}`));
      });
    };

    const onClosed = () => {
      settle(() => {
        cleanup();
        reject(new Error('Splash window was closed'));
      });
    };

    splashWindow.webContents.once('did-finish-load', onLoad);
    splashWindow.webContents.once('did-fail-load', onFail);
    splashWindow.once('ready-to-show', onReadyToShow);
    splashWindow.once('closed', onClosed);

    if (!splashWindow.webContents.isLoading() && splashWindow.isVisible()) {
      onLoad();
    }
  });
};