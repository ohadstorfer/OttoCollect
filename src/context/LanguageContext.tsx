import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/i18n/config';
import { useAuth } from './AuthContext';

type LanguageContextType = {
  currentLanguage: keyof typeof LANGUAGES;
  direction: 'ltr' | 'rtl';
  font: string;
  changeLanguage: (lang: keyof typeof LANGUAGES) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const { user, updateUserState } = useAuth();

  const currentLanguage = i18n.language as keyof typeof LANGUAGES;
  const direction = LANGUAGES[currentLanguage]?.dir || 'ltr';
  const font = LANGUAGES[currentLanguage]?.font || LANGUAGES.en.font;

  // Initialize language from user profile when user logs in
  useEffect(() => {
    if (user?.selected_language && user.selected_language !== currentLanguage) {
      console.log('🌐 [LanguageContext] Setting language from user profile:', user.selected_language);
      i18n.changeLanguage(user.selected_language);
    }
  }, [user?.selected_language, currentLanguage, i18n]);

  useEffect(() => {
    // Set direction on html element
    document.documentElement.dir = direction;
    // Set font family
    document.documentElement.style.setProperty('--font-primary', font);
  }, [direction, font]);

  const changeLanguage = async (lang: keyof typeof LANGUAGES) => {
    console.log('🌐 [LanguageContext] Changing language to:', lang);
    
    // Change the language in i18next
    await i18n.changeLanguage(lang);
    
    // Update user profile if user is logged in
    if (user) {
      console.log('💾 [LanguageContext] Updating user profile with new language:', lang);
      updateUserState({ selected_language: lang });
      
      // Import and call the profile service to update the database
      try {
        const { updateUserProfile } = await import('@/services/profileService');
        await updateUserProfile(user.id, { selected_language: lang } as any);
        console.log('✅ [LanguageContext] User profile updated successfully');
      } catch (error) {
        console.error('❌ [LanguageContext] Failed to update user profile:', error);
      }
    }
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