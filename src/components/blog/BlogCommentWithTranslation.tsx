import React, { useState, useEffect } from 'react';
import { BlogComment } from '@/types/blog';
import { blogTranslationService } from '@/services/blogTranslationService';
import { translationService } from '@/services/translationService';

interface BlogCommentWithTranslationProps {
  comment: BlogComment;
  currentLanguage: string;
  t: (key: string) => string;
}

// Simple function to detect and render links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const BlogCommentWithTranslation: React.FC<BlogCommentWithTranslationProps> = ({ 
  comment, 
  currentLanguage, 
  t 
}) => {
  console.log('🌐 [BlogCommentWithTranslation] Component MOUNTED with comment:', {
    id: comment.id,
    content: comment.content?.substring(0, 30) + '...',
    currentLanguage
  });
  
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [showTranslated, setShowTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(true);

  // Check if the current language matches the original language of the comment
  useEffect(() => {
    const checkOriginalLanguage = async () => {
      try {
        // Detect the original language of the content
        const contentLang = await translationService.detectLanguage(comment.content);
        
        console.log('🌐 [BlogCommentWithTranslation] Language detection:', {
          originalContent: comment.content.substring(0, 50) + '...',
          detectedLanguage: contentLang,
          currentLanguage: currentLanguage,
          shouldShow: contentLang !== currentLanguage
        });
        
        // If content is in the current language, don't show the button
        if (contentLang === currentLanguage) {
          setShouldShowButton(false);
          console.log('🌐 [BlogCommentWithTranslation] Hiding button - same language');
        } else {
          setShouldShowButton(true);
          console.log('🌐 [BlogCommentWithTranslation] Showing button - different language');
        }
      } catch (error) {
        console.error('Error detecting original language:', error);
        // Fallback: show button if we can't detect language
        setShouldShowButton(true);
        console.log('🌐 [BlogCommentWithTranslation] Fallback: showing button due to error');
      }
    };

    checkOriginalLanguage();
  }, [comment.content, currentLanguage]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const result = await blogTranslationService.translateComment(
        comment.id,
        currentLanguage as 'ar' | 'tr' | 'en'
        // No need to specify sourceLanguage - the service will detect it automatically
      );

      if (result.success && result.translatedContent) {
        setTranslatedContent(result.translatedContent);
        setShowTranslated(true);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleTranslation = () => {
    if (showTranslated) {
      setShowTranslated(false);
    } else if (translatedContent) {
      setShowTranslated(true);
    } else {
      handleTranslate();
    }
  };

  const getButtonText = () => {
    if (isTranslating) {
      return t('translation.translating');
    }
    if (showTranslated) {
      switch (currentLanguage) {
        case 'ar': return 'عرض النص الأصلي';
        case 'tr': return 'Orijinali göster';
        default: return 'Show original';
      }
    }
    return t('translation.translate');
  };

  return (
    <div className="space-y-3">
      <div className={`text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap overflow-hidden ${currentLanguage === 'ar' ? 'text-right' : ''}`}>
        {renderTextWithLinks(showTranslated && translatedContent ? translatedContent : comment.content)}
      </div>
      
      {/* Translation Button */}
      {shouldShowButton && (
        <div className={`${currentLanguage === 'ar' ? 'text-right' : ''}`}>
          <button
            onClick={toggleTranslation}
            disabled={isTranslating}
            className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {getButtonText()}
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogCommentWithTranslation;