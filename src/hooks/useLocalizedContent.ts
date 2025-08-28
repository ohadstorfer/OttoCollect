import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { databaseTranslationService, TranslationConfig } from '@/services/databaseTranslationService';
import { useToast } from '@/hooks/use-toast';

interface UseLocalizedContentOptions {
  autoTranslate?: boolean;
  onTranslationComplete?: (record: any) => void;
  onTranslationError?: (error: string) => void;
}

interface UseLocalizedContentReturn {
  getLocalizedText: (originalText: string, translatedText: string | null | undefined) => string;
  getLocalizedRecord: (config: TranslationConfig, record: any) => Promise<any>;
  getLocalizedRecords: (config: TranslationConfig, records: any[]) => Promise<any[]>;
  translateAndSave: (config: TranslationConfig, recordId: string, record: any, targetLanguage: 'ar' | 'tr') => Promise<boolean>;
  isTranslating: boolean;
  error: string | null;
}

export const useLocalizedContent = (options: UseLocalizedContentOptions = {}): UseLocalizedContentReturn => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { autoTranslate = false, onTranslationComplete, onTranslationError } = options;

  const getLocalizedText = useCallback((
    originalText: string,
    translatedText: string | null | undefined
  ): string => {
    return databaseTranslationService.getLocalizedText(
      originalText,
      translatedText,
      currentLanguage
    );
  }, [currentLanguage]);

  const getLocalizedRecord = useCallback(async (
    config: TranslationConfig,
    record: any
  ): Promise<any> => {
    setIsTranslating(true);
    setError(null);

    try {
      const localizedRecord = await databaseTranslationService.getLocalizedRecord(
        config,
        record,
        currentLanguage,
        autoTranslate
      );

      if (onTranslationComplete) {
        onTranslationComplete(localizedRecord);
      }

      return localizedRecord;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Localization failed';
      setError(errorMessage);
      
      if (onTranslationError) {
        onTranslationError(errorMessage);
      }

      toast({
        title: 'Localization Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return record; // Return original record on error
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, autoTranslate, onTranslationComplete, onTranslationError, toast]);

  const getLocalizedRecords = useCallback(async (
    config: TranslationConfig,
    records: any[]
  ): Promise<any[]> => {
    setIsTranslating(true);
    setError(null);

    try {
      const localizedRecords = await databaseTranslationService.getLocalizedRecords(
        config,
        records,
        currentLanguage,
        autoTranslate
      );

      if (onTranslationComplete) {
        localizedRecords.forEach(record => onTranslationComplete(record));
      }

      return localizedRecords;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch localization failed';
      setError(errorMessage);
      
      if (onTranslationError) {
        onTranslationError(errorMessage);
      }

      toast({
        title: 'Localization Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return records; // Return original records on error
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, autoTranslate, onTranslationComplete, onTranslationError, toast]);

  const translateAndSave = useCallback(async (
    config: TranslationConfig,
    recordId: string,
    record: any,
    targetLanguage: 'ar' | 'tr'
  ): Promise<boolean> => {
    setIsTranslating(true);
    setError(null);

    try {
      const success = await databaseTranslationService.translateAndSaveRecord(
        config,
        recordId,
        record,
        targetLanguage
      );

      if (success) {
        toast({
          title: 'Translation Saved',
          description: 'Content has been translated and saved successfully.',
          variant: 'default'
        });
      } else {
        throw new Error('Failed to save translation');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation and save failed';
      setError(errorMessage);
      
      if (onTranslationError) {
        onTranslationError(errorMessage);
      }

      toast({
        title: 'Translation Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return false;
    } finally {
      setIsTranslating(false);
    }
  }, [onTranslationError, toast]);

  return {
    getLocalizedText,
    getLocalizedRecord,
    getLocalizedRecords,
    translateAndSave,
    isTranslating,
    error
  };
};
