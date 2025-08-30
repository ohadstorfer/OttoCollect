import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
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

  const getLanguageName = () => {
    switch (currentLanguage) {
      case 'ar': return 'Arabic';
      case 'tr': return 'Turkish';
      default: return 'English';
    }
  };

  // Don't show button for English since it's the default
  if (currentLanguage === 'en') {
    return null;
  }

  return (
    <Button
      onClick={handleTranslate}
      disabled={isTranslating}
      variant={variant}
      size={size}
      className={`${className} text-muted-foreground hover:text-foreground h-6 px-2`}
    >
      {isTranslating ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          {t('translating')}
        </>
      ) : (
        <>
          <Languages className="h-3 w-3 mr-1" />
          Translate
        </>
      )}
    </Button>
  );
};