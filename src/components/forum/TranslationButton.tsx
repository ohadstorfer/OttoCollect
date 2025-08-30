import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { forumTranslationService } from '@/services/forumTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface TranslationButtonProps {
  postId: string;
  postType: 'forum_posts' | 'forum_announcements';
  currentTitle: string;
  currentContent: string;
  onTranslated: (title: string, content: string) => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export const TranslationButton: React.FC<TranslationButtonProps> = ({
  postId,
  postType,
  currentTitle,
  currentContent,
  onTranslated,
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['forum']);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!postId || currentLanguage === 'en') return;

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
        toast.success('Content translated successfully');
      } else {
        toast.error('Failed to translate content');
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
      className={className}
    >
      {isTranslating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t('translating')}...
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