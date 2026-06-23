import {
  type TerminalSeries,
  type TerminalSeriesAssetStatus,
  type TerminalSeriesLog,
} from '../types/terminalSeriesTypes';

export const createSeriesLog = (log: Omit<TerminalSeriesLog, 'id' | 'timestamp'>): TerminalSeriesLog => ({
  id: Math.random().toString(36).substring(7),
  timestamp: new Date().toISOString(),
  ...log,
});

export const withAssetStatus = (
  series: TerminalSeries | undefined,
  status: TerminalSeriesAssetStatus,
) => series?.assets.map((asset) => ({ ...asset, status })) ?? [];

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : fallback;
};
