import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { cn } from '../../../shared/lib/cn';

export const SeriesMetadata: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  const events = currentSeries.id === 'gascii'
    ? [
        { title: 'Gascii 서비스 진행', date: '06/02' },
        { title: 'Gascii 업데이트', url: 'https://aquatic-waiter-050.notion.site/Gascii-Version-Update-372ee832e9da80178ac9d84e0834132d?pvs=74', date: '06/02' }
      ]
    : [
        { title: 'Mienjine 서비스 진행', date: '06/02' },
        { title: 'Mienjine 업데이트', url: 'https://aquatic-waiter-050.notion.site/Mienjine-Version-Update-372ee832e9da805dbdc0f99f7bd076d5', date: '06/02' }
      ];

  const handleEventClick = async (url?: string) => {
    if (url) {
      await window.launcher.navigation.openExternal(url);
    }
  };

  return (
    <div className="flex flex-col h-full text-white">
      {events.map((event, idx) => (
        <button
          key={idx}
          onClick={() => void handleEventClick(event.url)}
          disabled={!event.url}
          className={cn(
            "w-full flex items-center justify-between px-6 py-4 border-b border-white/5 last:border-0 transition-colors group text-left",
            event.url 
              ? "hover:bg-white/10 cursor-pointer" 
              : "cursor-default hover:bg-transparent"
          )}
        >
          <span className={cn(
            "text-sm font-medium truncate pr-4 text-white/80",
            event.url ? "group-hover:text-launcher-accent font-semibold" : ""
          )}>
            {event.title}
          </span>
          <span className="text-xs text-white/50 font-mono tracking-wider group-hover:text-white/80">
            {event.date}
          </span>
        </button>
      ))}
    </div>
  );
};
