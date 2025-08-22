import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Custom backend for debugging
class DebugBackend extends Backend {
  constructor(services: any, options: any) {
    super(services, options);
    console.log('DebugBackend initialized with options:', options);
  }

  read(language: string, namespace: string, callback: Function) {
    console.log(`DebugBackend: Attempting to load ${language}/${namespace}`);
    super.read(language, namespace, (err: any, data: any) => {
      console.log(`DebugBackend: Load result for ${language}/${namespace}:`, { err, data });
      callback(err, data);
    });
  }
}

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
  .use(DebugBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: Object.keys(LANGUAGES),
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      reloadInterval: false,
      requestOptions: {
        cache: 'no-store'
      },
      allowMultiLoading: false,
      crossDomain: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
                    ns: ['common', 'navigation', 'auth', 'catalog', 'collection', 'marketplace', 'forum', 'profile', 'pages', 'guide', 'filter', 'blog', 'notification', 'badges', 'settings', 'contactUs', 'messaging', 'shared', 'admin'],
    preload: ['en', 'tr', 'ar'],
    defaultNS: 'common',
  });

// Force reload translations
export const reloadTranslations = () => {
  i18n.reloadResources();
};

export default i18n; 