import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageSquare, Calendar, User } from 'lucide-react';
import { BlogPost } from '@/types/blog';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';
import { useDateLocale, DATE_FORMATS } from '@/lib/dateUtils';
import { BlogTranslationButton } from '@/components/blog/BlogTranslationButton';
import { useLanguage } from '@/context/LanguageContext';

interface BlogPostCardProps {
  post: BlogPost;
}

const BlogPostCard = ({ post }: BlogPostCardProps) => {
  const navigate = useNavigate();
  const { formatDate } = useDateLocale();
  const { currentLanguage, direction } = useLanguage();
  
  // Translation state
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');
  const [showTranslated, setShowTranslated] = useState(false);

  const handlePostClick = () => {
    navigate(`/blog/${post.id}`);
  };

  const handleUserProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Navigate to user profile manually
    if (post.author) {
      navigate(`/profile/${post.author.username}`);
    }
  };

  // Display title (original or translated)
  const displayTitle = showTranslated && translatedTitle ? translatedTitle : post.title;
  
  // Display excerpt/content (original or translated)
  const displayExcerpt = showTranslated && translatedContent ? 
    (translatedContent.length > 150 ? translatedContent.substring(0, 150) + '...' : translatedContent) :
    (post.excerpt || (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content));

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border bg-card overflow-hidden group h-full flex flex-col"
      onClick={handlePostClick}
    >
      {/* Main Image */}
      {post.main_image_url && (
        <div className="relative aspect-video w-full overflow-hidden">
          <img 
            src={post.main_image_url} 
            alt={displayTitle} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <CardHeader className="p-4 pb-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-ottoman-600 transition-colors">
          <span>{displayTitle}</span>
        </h3>
        
        {/* Translation Button */}
        <div className={`mt-2`} onClick={(e) => e.stopPropagation()}>
          <BlogTranslationButton
            postId={post.id}
            currentTitle={displayTitle}
            currentContent={showTranslated && translatedContent ? translatedContent : post.content}
            originalTitle={post.title}
            originalContent={post.content}
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
            isShowingTranslation={showTranslated}
            size="sm"
            variant="ghost"
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {displayExcerpt}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t bg-muted/50 mt-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {/* Author and Date */}
          <div className="flex items-center gap-2 min-w-0">
            {post.author ? (
              <div onClick={handleUserProfileClick} className="cursor-pointer hover:underline">
                <UserProfileLink
                  userId={post.author.id}
                  username={post.author.username}
                  avatarUrl={post.author.avatarUrl}
                  size="sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback>{getInitials('Anonymous')}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">Anonymous</span>
              </div>
            )}
          </div>

          {/* Date and Comments */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(post.createdAt || post.created_at, DATE_FORMATS.DATE_ONLY)}
            </div>
            <div className="flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              {post.commentCount || 0}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BlogPostCard;