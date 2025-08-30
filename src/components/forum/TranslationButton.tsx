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
      case 'ar': return t('translation.translateTo') + ' العربية';
      case 'tr': return t('translation.translateTo') + ' Türkçe';
      default: return t('translation.translateTo') + ' English';
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
        getLanguageName()
      )}
    </button>
  );
};