import React, { useState, useEffect } from 'react';
import { ForumComment } from '@/types/forum';
import { forumTranslationService } from '@/services/forumTranslationService';

interface CommentWithTranslationProps {
  comment: ForumComment;
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

const CommentWithTranslation: React.FC<CommentWithTranslationProps> = ({ 
  comment, 
  currentLanguage, 
  t 
}) => {
  console.log('🌐 [CommentWithTranslation] Component MOUNTED with comment:', {
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
    if (comment.original_language) {
      // Use the stored original language instead of detecting
      const shouldShow = comment.original_language !== currentLanguage;
      setShouldShowButton(shouldShow);
      console.log('🌐 [CommentWithTranslation] Using stored original language:', {
        originalLanguage: comment.original_language,
        currentLanguage,
        shouldShow
      });
    } else {
      // Fallback: show button if we don't have original language
      setShouldShowButton(true);
      console.log('🌐 [CommentWithTranslation] No original language stored, showing button as fallback');
    }
  }, [comment.original_language, currentLanguage]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const result = await forumTranslationService.translateComment(
        comment.id,
        'forum_comments',
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

export default CommentWithTranslation;
