import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { forumTranslationService } from '@/services/forumTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { translationService } from '@/services/translationService';

interface TranslationButtonProps {
  postId: string;
  postType: 'forum_posts' | 'forum_announcements';
  currentTitle: string;
  currentContent: string;
  originalTitle: string;
  originalContent: string;
  onTranslated: (title: string, content: string) => void;
  isShowingTranslation: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export const TranslationButton: React.FC<TranslationButtonProps> = ({
  postId,
  postType,
  currentTitle,
  currentContent,
  originalTitle,
  originalContent,
  onTranslated,
  isShowingTranslation,
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['forum']);
  const [isTranslating, setIsTranslating] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(true);

  // Check if the current language matches the original language of the post
  useEffect(() => {
    const checkOriginalLanguage = async () => {
      try {
        // Detect the original language of the title and content
        const titleLang = await translationService.detectLanguage(originalTitle);
        const contentLang = await translationService.detectLanguage(originalContent);
        
        console.log('🌐 [TranslationButton] Language detection:', {
          originalTitle: originalTitle.substring(0, 30) + '...',
          originalContent: originalContent.substring(0, 30) + '...',
          titleLanguage: titleLang,
          contentLanguage: contentLang,
          currentLanguage: currentLanguage,
          shouldShow: !(titleLang === currentLanguage && contentLang === currentLanguage)
        });
        
        // If both title and content are in the current language, don't show the button
        if (titleLang === currentLanguage && contentLang === currentLanguage) {
          setShouldShowButton(false);
          console.log('🌐 [TranslationButton] Hiding button - same language');
        } else {
          setShouldShowButton(true);
          console.log('🌐 [TranslationButton] Showing button - different language');
        }
      } catch (error) {
        console.error('Error detecting original language:', error);
        // Fallback: show button if we can't detect language
        setShouldShowButton(true);
        console.log('🌐 [TranslationButton] Fallback: showing button due to error');
      }
    };

    checkOriginalLanguage();
  }, [originalTitle, originalContent, currentLanguage]);

  const handleToggleTranslation = async () => {
    if (!postId) return;

    // If showing translation, show original
    if (isShowingTranslation) {
      onTranslated(originalTitle, originalContent);
      return;
    }

    // Translate to current language if not already showing translation
    setIsTranslating(true);
    try {
      const result = await forumTranslationService.translatePost(
        postId,
        postType,
        currentLanguage as 'ar' | 'tr' | 'en'
        // No need to specify sourceLanguage - the service will detect it automatically
      );

      if (result.success && result.translatedTitle && result.translatedContent) {
        onTranslated(result.translatedTitle, result.translatedContent);
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
  // 1. We're not supposed to show it based on language detection, OR
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