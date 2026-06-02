import React, { useEffect } from 'react';
import { useTerminalSeriesStore } from '../../features/terminal-series/stores/terminalSeriesStore';
import { AppShell } from '../../shared/components/AppShell';
import { SeriesSidebar } from '../../features/terminal-series/components/SeriesSidebar';
import { SeriesHero } from '../../features/terminal-series/components/SeriesHero';
import { SeriesActionBar } from '../../features/terminal-series/components/SeriesActionBar';
import { useUIStore } from '../../shared/stores/uiStore';
import { Loader2, Home, Globe, Link, MessageSquare, Settings as SettingsIcon, Minus, X, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../shared/lib/cn';
import gasciiBanner from '../../../assets/gascii/banner.png';
import mienjineBanner from '../../../assets/mienjine/banner.png';

export const LauncherPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { openSettings } = useUIStore();
  const { initialize, isInitializing, error, series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <div className="bg-launcher-bg text-launcher-text flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-launcher-accent" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-launcher-bg text-launcher-text flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="text-launcher-danger text-4xl mb-4">⚠</div>
          <h2 className="text-xl font-bold">{t('launcher.init_failed')}</h2>
          <p className="text-launcher-textMuted">{error}</p>
        </div>
      </div>
    );
  }

  // Dynamic Background based on selected series
  const getBackgroundStyle = () => {
    if (currentSeries?.id === 'gascii') {
      return {
        background: 'var(--series-gascii-bg)'
      };
    }
    if (currentSeries?.id === 'mienjine') {
      return {
        background: 'var(--series-mienjine-bg)'
      };
    }
    return { background: 'var(--series-bg-base)' };
  };

  const socialLinks = [
    { 
      icon: Home, 
      url: 'https://github.com/ummsehun/launcher', 
      label: t('launcher.social.home_desc') 
    },
    { 
      icon: Globe, 
      url: 'https://aquatic-waiter-050.notion.site/TermPlay-372ee832e9da80c88193ec1d61b04615?source=copy_link', 
      label: t('launcher.social.notion_desc') 
    },
    {
      icon: Link,
      url: currentSeries?.id === 'gascii'
        ? 'https://github.com/ummsehun/Gascii'
        : currentSeries?.id === 'mienjine'
          ? 'https://github.com/ummsehun/3D-enjine'
          : '#',
      label: currentSeries?.id === 'gascii'
        ? t('launcher.social.gascii_desc')
        : currentSeries?.id === 'mienjine'
          ? t('launcher.social.mienjine_desc')
          : t('launcher.social.not_available')
    },
    { 
      icon: MessageSquare, 
      url: '#', 
      label: t('launcher.social.support_desc') 
    }
  ];

  const openExternalLink = async (url: string) => {
    if (url === '#') {
      return;
    }

    await window.launcher.navigation.openExternal(url);
  };

  return (
    <AppShell sidebar={<SeriesSidebar />}>
      {/* Immersive Background */}
      <div
        className="absolute inset-0 z-0 transition-colors duration-1000"
        style={getBackgroundStyle()}
      >
        {/* Series banner — full background */}
        {currentSeries?.id === 'gascii' && (
          <img
            src={gasciiBanner}
            alt=""
            className="[filter:var(--series-banner-filter)] opacity-[var(--series-banner-opacity)] absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            aria-hidden="true"
          />
        )}
        {currentSeries?.id === 'mienjine' && (
          <img
            src={mienjineBanner}
            alt=""
            className="[filter:var(--series-banner-filter)] opacity-[var(--series-banner-opacity)] absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            aria-hidden="true"
          />
        )}
        {/* Overlay so left-side UI remains readable */}
        <div className="bg-[var(--hero-side-overlay)] absolute inset-0 pointer-events-none" />
        {/* Bottom vignette */}
        <div className="bg-[var(--hero-bottom-overlay)] absolute inset-0 pointer-events-none" />
      </div>

      {/* Floating Right Social Toolbar */}
      <div 
        id="social-links-toolbar" 
        className="group/toolbar bg-launcher-panelBg border-launcher-panelBorder text-launcher-text absolute right-6 top-24 flex flex-col gap-3 z-40 backdrop-blur-md p-2 rounded-2xl border"
      >
        {/* Custom Toolbar Info Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-launcher-panelBg/95 border border-launcher-panelBorder text-launcher-text px-3 py-2 rounded-xl text-xs whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/toolbar:opacity-100 group-has-[button:hover]/toolbar:opacity-0 group-hover/toolbar:scale-100 group-has-[button:hover]/toolbar:scale-95 transition-all duration-150 delay-75 shadow-lg backdrop-blur-md flex items-center gap-2 z-50">
          <div className="w-1.5 h-1.5 rounded-full bg-launcher-accent animate-pulse" />
          <span>{t('launcher.social.toolbar_desc')}</span>
          {/* Arrow */}
          <div className="absolute top-1/2 -translate-y-1/2 left-full border-[6px] border-transparent border-l-launcher-panelBorder" />
          <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%-1px)] border-[5px] border-transparent border-l-launcher-panelBg" />
        </div>

        {socialLinks.map((item, idx) => (
          <button
            key={idx}
            id={
              idx === 0 
                ? 'social-link-home' 
                : idx === 1 
                  ? 'social-link-globe' 
                  : idx === 2 
                    ? 'social-link-link' 
                    : 'social-link-message'
            }
            onClick={() => void openExternalLink(item.url)}
            className={cn(
              "group/btn relative w-8 h-8 rounded-full flex items-center justify-center transition-all",
              item.url !== '#'
                ? "bg-launcher-control text-launcher-textMuted hover:text-launcher-text hover:bg-launcher-controlHover cursor-pointer"
                : "bg-launcher-control/40 text-launcher-textMuted/30 cursor-not-allowed"
            )}
          >
            <item.icon size={16} />
            
            {/* Custom Individual Button Tooltip */}
            <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-launcher-panelBg/95 border border-launcher-panelBorder text-launcher-text px-2.5 py-1.5 rounded-xl text-[10px] whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-100 delay-75 shadow-md backdrop-blur-md z-50 flex items-center gap-1.5">
              <span>{item.label}</span>
              {/* Arrow */}
              <div className="absolute top-1/2 -translate-y-1/2 left-full border-4 border-transparent border-l-launcher-panelBorder" />
              <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%-1px)] border-[3.5px] border-transparent border-l-launcher-panelBg" />
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      {currentSeries ? (
        <div className="relative z-10 w-full h-full flex">
          {/* Left Hero Area */}
          <SeriesHero />

          {/* Bottom Right CTA Area */}
          <div className="absolute bottom-8 right-8 z-50">
            <SeriesActionBar />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex items-center justify-center text-launcher-textMuted">
          {t('launcher.select_project')}
        </div>
      )}
    </AppShell>
  );
};
