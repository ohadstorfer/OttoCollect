import React, { useState } from 'react';
import { ForumComment } from '@/types/forum';
import { forumTranslationService } from '@/services/forumTranslationService';

interface CommentWithTranslationProps {
  comment: ForumComment;
  currentLanguage: string;
  t: (key: string) => string;
  commentType?: 'forum_comments' | 'forum_announcement_comments';
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
  t,
  commentType = 'forum_comments'
}) => {
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [showTranslated, setShowTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (currentLanguage === 'en') return;
    
    setIsTranslating(true);
    try {
      const result = await forumTranslationService.translateComment(
        comment.id,
        commentType,
        currentLanguage as 'ar' | 'tr',
        'en'
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
      {currentLanguage !== 'en' && (
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
