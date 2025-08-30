import React, { useState } from 'react';
import { BlogComment } from '@/types/blog';
import { blogTranslationService } from '@/services/blogTranslationService';

interface BlogCommentWithTranslationProps {
  comment: BlogComment;
  currentLanguage: string;
  t: (key: string) => string;
}

// Function to detect and make links clickable
const renderTextWithLinks = (text: string) => {
  if (!text) return text;
  
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
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [showTranslated, setShowTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (currentLanguage === 'en') return;
    
    setIsTranslating(true);
    try {
      const result = await blogTranslationService.translateComment(
        comment.id,
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
      <div className={`whitespace-pre-line break-words overflow-wrap-anywhere ${currentLanguage === 'ar' ? 'text-right' : ''}`}>
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

export default BlogCommentWithTranslation;