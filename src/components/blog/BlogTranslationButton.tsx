import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { blogTranslationService } from '@/services/blogTranslationService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BlogTranslationButtonProps {
  postId: string;
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

export const BlogTranslationButton: React.FC<BlogTranslationButtonProps> = ({
  postId,
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
  const { t } = useTranslation(['blog']);
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
        const result = await blogTranslationService.translatePost(
          postId,
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
    
    // Use the translateTo key with language interpolation
    let targetLanguage = 'English';
    if (currentLanguage === 'ar') {
      targetLanguage = 'الإنجليزية';
    } else if (currentLanguage === 'tr') {
      targetLanguage = 'İngilizce';
    }
    
    return t('translation.translateTo', { language: targetLanguage });
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