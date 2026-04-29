import type { GameId, GameStatus } from '@shared/games';
import type { TerminalSeriesId, LauncherSettingKey, SelectInstallPathResponse, SetSeriesOptionResponse } from '@shared/launcherTypes';

type LaunchResult =
  | {
      ok: true;
      gameId: GameId;
      command: string;
      terminal: string;
      runId: string;
    }
  | {
      ok: false;
      error: string;
    };

declare global {
  interface Window {
    launcher: {
      game: {
        launch: (gameId: GameId) => Promise<LaunchResult>;
        onStatusChanged: (
          callback: (event: { gameId: GameId; status: GameStatus; message: string }) => void,
        ) => () => void;
      };
      settings: {
        selectInstallPath: () => Promise<SelectInstallPathResponse>;
        setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => Promise<SetSeriesOptionResponse>;
      };
      library: {
        openDir: (seriesId: string, dir: string) => Promise<void>;
      };
      assets: {
        download: (assetId: string) => Promise<void>;
        onProgress: (callback: (event: unknown) => void) => () => void;
      };
    };
  }
}

export {};
