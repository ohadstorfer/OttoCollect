import React from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/context/LanguageContext';

interface TranslationButtonProps {
  text: string;
  onTranslated: (translatedText: string, targetLanguage: 'ar' | 'tr') => void;
  targetLanguage?: 'ar' | 'tr';
  sourceLanguage?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
}

export const TranslationButton: React.FC<TranslationButtonProps> = ({
  text,
  onTranslated,
  targetLanguage,
  sourceLanguage = 'en',
  size = 'sm',
  variant = 'outline',
  disabled = false,
  className = ''
}) => {
  const { translate, isTranslating } = useTranslation();
  const { currentLanguage } = useLanguage();

  const handleTranslate = async () => {
    if (!text || text.trim() === '') return;

    const target = targetLanguage || (currentLanguage === 'en' ? 'ar' : currentLanguage as 'ar' | 'tr');
    const translatedText = await translate(text, target, sourceLanguage);
    
    if (translatedText && translatedText !== text) {
      onTranslated(translatedText, target);
    }
  };

  const getLanguageName = () => {
    const target = targetLanguage || (currentLanguage === 'en' ? 'ar' : currentLanguage as 'ar' | 'tr');
    return target === 'ar' ? 'Arabic' : 'Turkish';
  };

  return (
    <Button
      onClick={handleTranslate}
      disabled={disabled || isTranslating || !text || text.trim() === ''}
      variant={variant}
      size={size}
      className={className}
    >
      {isTranslating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Translating...
        </>
      ) : (
        <>
          <Languages className="h-4 w-4 mr-2" />
          Translate to {getLanguageName()}
        </>
      )}
    </Button>
  );
};