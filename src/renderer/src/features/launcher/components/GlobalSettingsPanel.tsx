import React, { useState } from 'react';
import { Globe, HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout } from './SettingsLayout';
import { ToggleRow } from '../../../shared/components/ui/ToggleRow';
import { cn } from '../../../shared/lib/cn';
import { useLauncherConfigStore, Language } from '../stores/launcherConfigStore';

export const GlobalSettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { global, setAutoUpdate, setLanguage, setTheme } = useLauncherConfigStore();
  const [isChecking, setIsChecking] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setUpdateMessage(null);
    try {
      const result = await window.launcher.updates.check();
      if (result.ok) {
        const state = result.data;
        if (state.status === 'not-available') {
          setUpdateMessage(t('launcher.settings.update_latest', '최신 버전을 사용 중입니다.'));
        } else if (state.status === 'error') {
          setUpdateMessage(state.message || t('launcher.settings.update_failed', '업데이트 확인에 실패했습니다.'));
        }
      } else {
        setUpdateMessage(result.error || t('launcher.settings.update_failed', '업데이트 확인에 실패했습니다.'));
      }
    } catch (error) {
      setUpdateMessage(t('launcher.settings.update_failed', '업데이트 확인에 실패했습니다.'));
    } finally {
      setIsChecking(false);
    }
  };

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
        <div className="space-y-3">
          <div className="p-4 rounded-lg border border-launcher-divider bg-launcher-surface/5 hover:bg-launcher-surface/10 transition-colors">
            <ToggleRow 
              label={t('launcher.settings.auto_update')} 
              description={t('launcher.settings.auto_update_desc')} 
              checked={global.autoUpdate} 
              onCheckedChange={setAutoUpdate} 
            />
          </div>

          <div className="p-4 rounded-lg border border-launcher-divider bg-launcher-surface/5 hover:bg-launcher-surface/10 transition-colors flex items-center justify-between gap-4">
            <div>
              <h4 className="text-[13px] font-semibold text-launcher-text">{t('launcher.settings.check_update', '런처 업데이트 확인')}</h4>
              <p className="text-[11px] text-launcher-textMuted mt-1">
                {updateMessage || t('launcher.settings.check_update_desc', '새로운 버전의 런처가 있는지 확인합니다.')}
              </p>
            </div>
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-launcher-accent px-4 text-[12px] font-bold text-white shadow transition-colors hover:bg-launcher-accentHover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isChecking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {t('launcher.settings.check_button', '업데이트 확인')}
            </button>
          </div>
        </div>
      </section>
    </SettingsLayout>
  );
};
