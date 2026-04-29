import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import koTranslation from './ko/translation.json';
import enTranslation from './en/translation.json';
import jaTranslation from './ja/translation.json';

const resources = {
  ko: { translation: koTranslation },
  en: { translation: enTranslation },
  ja: { translation: jaTranslation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
