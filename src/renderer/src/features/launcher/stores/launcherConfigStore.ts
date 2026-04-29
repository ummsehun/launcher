import { create } from 'zustand';
import { TerminalSeriesId, LauncherSettingKey } from '../../terminal-series/constants/seriesFeatureConfig';

export type Language = 'ko' | 'en' | 'ja';

type LauncherConfigState = {
  global: {
    language: Language;
    autoUpdate: boolean;
  };
  series: Record<TerminalSeriesId, {
    installPath: string;
    options: Partial<Record<LauncherSettingKey, boolean>>;
  }>;
  setLanguage: (language: Language) => Promise<void>;
  setAutoUpdate: (enabled: boolean) => Promise<void>;
  setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => Promise<void>;
  setInstallPath: (seriesId: TerminalSeriesId, path: string) => Promise<void>;
};

const initialState = {
  global: {
    language: 'ko' as Language,
    autoUpdate: true,
  },
  series: {
    gascii: {
      installPath: 'C:\\Program Files\\Lanchaer\\gascii',
      options: {
        hwAccel: true,
        autoClean: true,
      }
    },
    mienjine: {
      installPath: 'C:\\Program Files\\Lanchaer\\mienjine',
      options: {
        highRes: true,
        physics: true,
      }
    }
  }
};

export const useLauncherConfigStore = create<LauncherConfigState>((set, get) => ({
  ...initialState,
  
  setLanguage: async (language) => {
    set((state) => ({ global: { ...state.global, language } }));
  },
  
  setAutoUpdate: async (autoUpdate) => {
    set((state) => ({ global: { ...state.global, autoUpdate } }));
  },

  setSeriesOption: async (seriesId, key, value) => {
    const previousState = get().series[seriesId]?.options[key];
    set((state) => ({
      series: {
        ...state.series,
        [seriesId]: {
          ...state.series[seriesId],
          options: {
            ...state.series[seriesId].options,
            [key]: value
          }
        }
      }
    }));

    try {
      const result = await window.launcher.settings.setSeriesOption(seriesId, key, value);
      if (!result.ok) {
        throw new Error(result.error);
      }
    } catch (e) {
      console.error('Failed to set series option', e);
      if (previousState !== undefined) {
        set((state) => ({
          series: {
            ...state.series,
            [seriesId]: {
              ...state.series[seriesId],
              options: {
                ...state.series[seriesId].options,
                [key]: previousState
              }
            }
          }
        }));
      }
    }
  },

  setInstallPath: async (seriesId, path) => {
    set((state) => ({
      series: {
        ...state.series,
        [seriesId]: {
          ...state.series[seriesId],
          installPath: path
        }
      }
    }));
  }
}));
