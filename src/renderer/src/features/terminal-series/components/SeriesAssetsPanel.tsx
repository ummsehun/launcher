import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';

export const SeriesAssetsPanel: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  const notices = currentSeries.id === 'gascii'
    ? ['없습니다.']
    : ['없습니다'];

  return (
    <div className="flex flex-col h-full text-white/85 p-6 space-y-4">
      {notices.map((notice, idx) => (
        <div key={idx} className="text-sm border-l-2 border-white/20 pl-4 py-1 leading-relaxed text-white/70">
          {notice}
        </div>
      ))}
    </div>
  );
};
