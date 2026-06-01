import React from 'react';
import { Globe, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout } from './SettingsLayout';
import { ToggleRow } from '../../../shared/components/ui/ToggleRow';
import { cn } from '../../../shared/lib/cn';
import { useLauncherConfigStore, Language } from '../stores/launcherConfigStore';

export const GlobalSettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { global, setAutoUpdate, setLanguage, setTheme } = useLauncherConfigStore();

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
        <h3 className="text-[13px] font-semibold text-launcher-textMuted">{t('launcher.settings.language')}</h3>
        <div className="p-6 rounded-xl border border-launcher-divider bg-launcher-surface/10">
          <div className="flex gap-3">
            {['ko', 'en', 'ja'].map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={cn(
                  "px-4 py-2 rounded-lg border font-medium transition-colors text-[13px] cursor-pointer",
                  i18n.language === lang 
                    ? "bg-launcher-accent/10 border-launcher-accent text-launcher-accent font-semibold" 
                    : "bg-launcher-surface/20 border-launcher-divider text-launcher-textMuted hover:border-launcher-border hover:bg-launcher-control/50 hover:text-launcher-text"
                )}
              >
                {lang === 'ko' ? '한국어' : lang === 'en' ? 'English' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold text-launcher-textMuted">{t('launcher.settings.theme', '테마')}</h3>
        <div className="p-6 rounded-xl border border-launcher-divider bg-launcher-surface/10">
          <div className="flex gap-3">
            {[
              { id: 'light', label: t('launcher.settings.theme_light', '라이트') },
              { id: 'dark', label: t('launcher.settings.theme_dark', '다크') },
              { id: 'system', label: t('launcher.settings.theme_system', '자동') }
            ].map(themeItem => (
              <button
                key={themeItem.id}
                onClick={() => void setTheme(themeItem.id as 'light' | 'dark' | 'system')}
                className={cn(
                  "px-4 py-2 rounded-lg border font-medium transition-colors text-[13px] cursor-pointer",
                  (global.theme || 'system') === themeItem.id 
                    ? "bg-launcher-accent/10 border-launcher-accent text-launcher-accent font-semibold" 
                    : "bg-launcher-surface/20 border-launcher-divider text-launcher-textMuted hover:border-launcher-border hover:bg-launcher-control/50 hover:text-launcher-text"
                )}
              >
                {themeItem.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold text-launcher-textMuted">{t('launcher.settings.advanced')}</h3>
        <div className="p-4 rounded-lg border border-launcher-divider bg-launcher-surface/5 hover:bg-launcher-surface/10 transition-colors">
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
