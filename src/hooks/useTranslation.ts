import { useState, useCallback } from 'react';
import { translationService } from '@/services/translationService';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface UseTranslationReturn {
  translate: (text: string, targetLanguage?: 'ar' | 'tr', sourceLanguage?: string) => Promise<string>;
  translateBatch: (texts: string[], targetLanguage?: 'ar' | 'tr', sourceLanguage?: string) => Promise<string[]>;
  isTranslating: boolean;
  error: string | null;
  getLocalizedContent: (originalText: string, translatedText: string | null | undefined, fallbackText?: string) => string;
}

export const useTranslation = (): UseTranslationReturn => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();

  const translate = useCallback(async (
    text: string, 
    targetLanguage?: 'ar' | 'tr', 
    sourceLanguage: string = 'en'
  ): Promise<string> => {
    if (!text || text.trim() === '') {
      return text;
    }

    const target = targetLanguage || (currentLanguage === 'en' ? 'ar' : currentLanguage as 'ar' | 'tr');
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translationService.translateText(text, target, sourceLanguage);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      toast({
        title: 'Translation Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return text; // Return original text on error
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, toast]);

  const translateBatch = useCallback(async (
    texts: string[], 
    targetLanguage?: 'ar' | 'tr', 
    sourceLanguage: string = 'en'
  ): Promise<string[]> => {
    const target = targetLanguage || (currentLanguage === 'en' ? 'ar' : currentLanguage as 'ar' | 'tr');
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const results = await translationService.translateBatch(texts, target, sourceLanguage);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch translation failed';
      setError(errorMessage);
      toast({
        title: 'Translation Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return texts; // Return original texts on error
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, toast]);

  const getLocalizedContent = useCallback((
    originalText: string,
    translatedText: string | null | undefined,
    fallbackText?: string
  ): string => {
    return translationService.getTranslatedContent(originalText, translatedText, fallbackText);
  }, []);

  return {
    translate,
    translateBatch,
    isTranslating,
    error,
    getLocalizedContent
  };
};