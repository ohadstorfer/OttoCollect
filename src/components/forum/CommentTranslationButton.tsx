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
  onTranslated: (content: string) => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export const CommentTranslationButton: React.FC<CommentTranslationButtonProps> = ({
  commentId,
  commentType,
  currentContent,
  onTranslated,
  size = 'sm',
  variant = 'ghost',
  className = ''
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['forum']);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!commentId || currentLanguage === 'en') return;

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
        toast.success('Comment translated successfully');
      } else {
        toast.error('Failed to translate comment');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Don't show button for English since it's the default
  if (currentLanguage === 'en') {
    return null;
  }

  return (
    <button
      onClick={handleTranslate}
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
        t('translation.translate')
      )}
    </button>
  );
};