import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Calendar, User } from 'lucide-react';
import { ForumPost } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';
import { useDateLocale, DATE_FORMATS } from '@/lib/dateUtils';
import { TranslationButton } from '@/components/forum/TranslationButton';
import { useLanguage } from '@/context/LanguageContext';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: string;
}

interface ForumPostWithAuthor extends Omit<ForumPost, 'author'> {
  author: Author;
  commentCount?: number;
  original_language?: string;
}

interface ForumPostCardProps {
  post: ForumPostWithAuthor;
}

// Simple function to detect and render links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const ForumPostCard = ({ post }: ForumPostCardProps) => {
  const navigate = useNavigate();
  const { formatDate } = useDateLocale();
  const { direction } = useLanguage();
  
  // Translation state
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');
  const [showTranslated, setShowTranslated] = useState(false);

  const handlePostClick = () => {
    navigate(`/forum-post/${post.id}`);
  };

  const handleUserProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Navigate to user profile manually
    navigate(`/profile/${encodeURIComponent(post.author.username)}`);
  };

  return (
    <Card 
      className="hover:bg-muted/50 transition-colors duration-200 cursor-pointer border-b border-l border-r border-t-0 rounded-none first:border-t last:rounded-b-md group"
      onClick={handlePostClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Title and Author Section */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base line-clamp-1 group-hover:text-primary transition-colors mb-1">
              <span>{renderTextWithLinks(showTranslated && translatedTitle ? translatedTitle : post.title)}</span>
            </h3>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div 
                onClick={handleUserProfileClick}
                className="cursor-pointer hover:underline"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {post.author.avatarUrl ? (
                      <img 
                        src={post.author.avatarUrl} 
                        alt={post.author.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{post.author.username}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(post.created_at, DATE_FORMATS.SHORT)}
              </div>
            </div>

            {/* Translation Button - New row for better mobile spacing */}
            <div className={`mt-2 `} onClick={(e) => e.stopPropagation()}>
              <TranslationButton
                postId={post.id}
                postType="forum_posts"
                currentTitle={showTranslated && translatedTitle ? translatedTitle : post.title}
                currentContent={showTranslated && translatedContent ? translatedContent : post.content}
                originalTitle={post.title}
                originalContent={post.content}
                originalLanguage={post.original_language}
                isShowingTranslation={showTranslated}
                onTranslated={(title, content) => {
                  if (title === post.title && content === post.content) {
                    // Show original
                    setShowTranslated(false);
                  } else {
                    // Show translation
                    setTranslatedTitle(title);
                    setTranslatedContent(content);
                    setShowTranslated(true);
                  }
                }}
              />
            </div>
          </div>

          {/* Comments Count */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium">{post.commentCount || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumPostCard;