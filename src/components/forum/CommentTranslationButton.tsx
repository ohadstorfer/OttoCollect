import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { forumTranslationService } from '@/services/forumTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { translationService } from '@/services/translationService';

interface CommentTranslationButtonProps {
  commentId: string;
  commentType: 'forum_comments' | 'forum_announcement_comments';
  currentContent: string;
  originalContent: string;
  onTranslated: (content: string) => void;
  isShowingTranslation: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export const CommentTranslationButton: React.FC<CommentTranslationButtonProps> = ({
  commentId,
  commentType,
  currentContent,
  originalContent,
  onTranslated,
  isShowingTranslation,
  size = 'sm',
  variant = 'ghost',
  className = ''
}) => {
  console.log('🌐 [CommentTranslationButton] Component MOUNTED with props:', {
    commentId,
    commentType,
    currentContent: currentContent?.substring(0, 30) + '...',
    originalContent: originalContent?.substring(0, 30) + '...',
    isShowingTranslation,
    className
  });

  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['forum']);
  const [isTranslating, setIsTranslating] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(true);

  // Check if the current language matches the original language of the comment
  useEffect(() => {
    const checkOriginalLanguage = async () => {
      try {
        // Detect the original language of the content
        const contentLang = await translationService.detectLanguage(originalContent);
        
        console.log('🌐 [CommentTranslationButton] Language detection:', {
          originalContent: originalContent.substring(0, 50) + '...',
          detectedLanguage: contentLang,
          currentLanguage: currentLanguage,
          shouldShow: contentLang !== currentLanguage
        });
        
        // If content is in the current language, don't show the button
        if (contentLang === currentLanguage) {
          setShouldShowButton(false);
          console.log('🌐 [CommentTranslationButton] Hiding button - same language');
        } else {
          setShouldShowButton(true);
          console.log('🌐 [CommentTranslationButton] Showing button - different language');
        }
      } catch (error) {
        console.error('Error detecting original language:', error);
        // Fallback: show button if we can't detect language
        setShouldShowButton(true);
        console.log('🌐 [CommentTranslationButton] Fallback: showing button due to error');
      }
    };

    checkOriginalLanguage();
  }, [originalContent, currentLanguage]);

  const handleToggleTranslation = async () => {
    if (!commentId) return;

    // If showing translation, show original
    if (isShowingTranslation) {
      onTranslated(originalContent);
      return;
    }

    // Translate to current language if not already showing translation
    setIsTranslating(true);
    try {
      const result = await forumTranslationService.translateComment(
        commentId,
        commentType,
        currentLanguage as 'ar' | 'tr' | 'en'
        // No need to specify sourceLanguage - the service will detect it automatically
      );

      if (result.success && result.translatedContent) {
        onTranslated(result.translatedContent);
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
    return t('translation.translate');
  };

  // Don't show button if:
  // 1. We're not supposed to show it based on language detection, OR
  // 2. We're not showing translation and the current language matches the original
  if (!shouldShowButton && !isShowingTranslation) {
    console.log('🌐 [CommentTranslationButton] Hiding button - language detection says no');
    return null;
  }

  console.log('🌐 [CommentTranslationButton] Rendering button - shouldShowButton:', shouldShowButton, 'isShowingTranslation:', isShowingTranslation);

  return (
    <button
      onClick={handleToggleTranslation}
      disabled={isTranslating}
      className={`text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer ${
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