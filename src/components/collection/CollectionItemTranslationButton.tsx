import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { collectionItemTranslationService } from '@/services/collectionItemTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CollectionItemTranslationButtonProps {
  itemId: string;
  currentPublicNote: string;
  originalPublicNote: string;
  originalLanguage?: string;
  onTranslated: (publicNote: string) => void;
  isShowingTranslation: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export const CollectionItemTranslationButton: React.FC<CollectionItemTranslationButtonProps> = ({
  itemId,
  currentPublicNote,
  originalPublicNote,
  originalLanguage,
  onTranslated,
  isShowingTranslation,
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['collection']);
  const [isTranslating, setIsTranslating] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);

  // Check if the current language matches the original language of the public note
  useEffect(() => {
    if (originalLanguage) {
      // Use the stored original language instead of detecting
      const shouldShow = originalLanguage !== currentLanguage;
      setShouldShowButton(shouldShow);
      console.log('🌐 [CollectionItemTranslationButton] Using stored original language:', {
        originalLanguage,
        currentLanguage,
        shouldShow
      });
    } else {
      // Fallback: show button if we don't have original language
      setShouldShowButton(true);
      console.log('🌐 [CollectionItemTranslationButton] No original language stored, showing button as fallback');
    }
  }, [originalLanguage, currentLanguage]);

  const handleToggleTranslation = async () => {
    if (!itemId) return;

    // If showing translation, show original
    if (isShowingTranslation) {
      onTranslated(originalPublicNote);
      return;
    }

    // Translate to current language if not already showing translation
    setIsTranslating(true);
    try {
      const result = await collectionItemTranslationService.translatePublicNote(
        itemId,
        currentLanguage as 'ar' | 'tr' | 'en'
        // No need to specify sourceLanguage - the service will detect it automatically
      );

      if (result.success && result.translatedPublicNote) {
        onTranslated(result.translatedPublicNote);
        toast.success(t('translation.translated_successfully'));
      } else {
        toast.error(t('translation.translation_failed'));
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('translation.translation_failed'));
    } finally {
      setIsTranslating(false);
    }
  };

  const getButtonText = () => {
    if (isShowingTranslation) {
      // Show "Show original" in the current language
      switch (currentLanguage) {
        case 'ar': return 'عرض النص الأصلي';
        case 'tr': return 'Orijinali göster';
        default: return 'Show original';
      }
    }
    switch (currentLanguage) {
      case 'ar': return t('translation.translateTo') + ' العربية';
      case 'tr': return t('translation.translateTo') + ' Türkçe';
      default: return t('translation.translateTo') + ' English';
    }
  };

  // Don't show button if:
  // 1. We're not supposed to show it based on original language, OR
  // 2. We're not showing translation and the current language matches the original
  if (!shouldShowButton && !isShowingTranslation) {
    return null;
  }

  return (
    <button
      onClick={handleToggleTranslation}
      disabled={isTranslating}
      className={`text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer ${
        currentLanguage === 'ar' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {isTranslating ? (
        <span className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('translation.translating')}...
        </span>
      ) : (
        getButtonText()
      )}
    </button>
  );
};
