import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/i18n/config';

type LanguageContextType = {
  currentLanguage: keyof typeof LANGUAGES;
  direction: 'ltr' | 'rtl';
  font: string;
  changeLanguage: (lang: keyof typeof LANGUAGES) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language as keyof typeof LANGUAGES;
  const direction = LANGUAGES[currentLanguage]?.dir || 'ltr';
  const font = LANGUAGES[currentLanguage]?.font || LANGUAGES.en.font;

  useEffect(() => {
    // Set direction on html element
    document.documentElement.dir = direction;
    // Set font family
    document.documentElement.style.setProperty('--font-primary', font);
  }, [direction, font]);

  const changeLanguage = async (lang: keyof typeof LANGUAGES) => {
    await i18n.changeLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, direction, font, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 