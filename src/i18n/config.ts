import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

export const LANGUAGES = {
  en: { code: 'en', name: 'English', dir: 'ltr', font: "'Inter', sans-serif" },
  ar: { 
    code: 'ar', 
    name: 'العربية', 
    dir: 'rtl', 
    font: "'Noto Sans Arabic', 'Noto Naskh Arabic', 'Amiri', system-ui, -apple-system, sans-serif" 
  },
  tr: { code: 'tr', name: 'Türkçe', dir: 'ltr', font: "'Inter', sans-serif" },
} as const;

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: Object.keys(LANGUAGES),
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: ['common'],
    defaultNS: 'common',
  });

export default i18n; 