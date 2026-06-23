import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';

export const SeriesLogsPanel: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  const infoText = currentSeries.id === 'gascii'
    ? 'gascii v0.9'
    : 'Mienjine v0.1.5';

  return (
    <div className="flex flex-col h-full text-white/85 p-6 space-y-4">
      <div className="text-sm border-l-2 border-white/20 pl-4 py-1 leading-relaxed text-white/70">
        {infoText}
      </div>
    </div>
  );
};
