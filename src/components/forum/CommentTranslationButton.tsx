import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { forumTranslationService } from '@/services/forumTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['forum']);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleToggleTranslation = async () => {
    if (!commentId) return;

    // If showing translation, show original
    if (isShowingTranslation) {
      onTranslated(originalContent);
      return;
    }

    // If not English and not showing translation, translate
    if (currentLanguage !== 'en') {
      setIsTranslating(true);
      try {
        const targetLanguage = currentLanguage as 'ar' | 'tr';
        const result = await forumTranslationService.translateComment(
          commentId,
          commentType,
          targetLanguage,
          'en' // assuming source is English for now
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
    }
  };

  const getButtonText = () => {
    if (isShowingTranslation) {
      return t('translation.showOriginal');
    }
    return t('translation.translate');
  };

  // Don't show button for English since it's the default (unless showing translation)
  if (currentLanguage === 'en' && !isShowingTranslation) {
    return null;
  }

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