import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { forumTranslationService } from '@/services/forumTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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

  const handleToggleTranslation = async () => {
    if (!postId) return;

    // If showing translation, show original
    if (isShowingTranslation) {
      onTranslated(originalTitle, originalContent);
      return;
    }

    // If not English and not showing translation, translate
    if (currentLanguage !== 'en') {
      setIsTranslating(true);
      try {
        const targetLanguage = currentLanguage as 'ar' | 'tr';
        const result = await forumTranslationService.translatePost(
          postId,
          postType,
          targetLanguage,
          'en' // assuming source is English for now
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

  // Don't show button for English since it's the default (unless showing translation)
  if (currentLanguage === 'en' && !isShowingTranslation) {
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