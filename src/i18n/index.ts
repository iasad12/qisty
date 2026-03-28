import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ur from './locales/ur.json';

const resources = {
  en: en,
  ur: ur,
};

const getDeviceLang = () => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      return locales[0].languageCode?.split('-')[0] || 'en';
    }
  } catch (e) {
    console.warn('Error getting device locale:', e);
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: getDeviceLang(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
