import React from 'react';
import { Globe, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout } from './SettingsLayout';
import { ToggleRow } from '../../../shared/components/ui/ToggleRow';
import { cn } from '../../../shared/lib/cn';
import { useLauncherConfigStore, Language } from '../stores/launcherConfigStore';

export const GlobalSettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { global, setAutoUpdate, setLanguage } = useLauncherConfigStore();

  const handleLanguageChange = (lang: string) => {
    const validLang = lang as Language;
    i18n.changeLanguage(validLang);
    setLanguage(validLang);
  };

  const navItems = [
    { id: 'general', label: t('launcher.settings.general'), icon: Globe, isActive: true },
    { id: 'storage', label: t('launcher.settings.storage'), icon: HardDrive, disabled: true }
  ];

  return (
    <SettingsLayout title={t('launcher.settings.title')} navItems={navItems}>
      <section className="space-y-3">
        <h3 className="text-[13px] font-bold text-launcher-textMuted">{t('launcher.settings.language')}</h3>
        <div className="p-6 rounded-xl border border-launcher-divider bg-launcher-panelElevated">
          <div className="flex gap-4">
            {['ko', 'en', 'ja'].map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={cn(
                  "px-6 py-3 rounded-lg border font-medium transition-all text-[14px]",
                  i18n.language === lang 
                    ? "bg-launcher-accent/20 border-launcher-accent text-launcher-accent" 
                    : "bg-launcher-control border-launcher-divider text-launcher-textMuted hover:border-launcher-border hover:text-launcher-text"
                )}
              >
                {lang === 'ko' ? '한국어' : lang === 'en' ? 'English' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-bold text-launcher-textMuted">{t('launcher.settings.advanced')}</h3>
        <div className="space-y-3">
          <ToggleRow 
            label={t('launcher.settings.auto_update')} 
            description={t('launcher.settings.auto_update_desc')} 
            checked={global.autoUpdate} 
            onCheckedChange={setAutoUpdate} 
          />
        </div>
      </section>
    </SettingsLayout>
  );
};
