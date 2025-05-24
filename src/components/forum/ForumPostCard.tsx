import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageSquare, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ForumPost } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';

interface ForumPostCardProps {
  post: ForumPost;
}

const ForumPostCard = ({ post }: ForumPostCardProps) => {
  const navigate = useNavigate();
  
  // Truncate the content if it's too long
  const truncatedContent = post.content.length > 150 
    ? `${post.content.substring(0, 150)}...` 
    : post.content;

  const handlePostClick = () => {
    navigate(`/community/forum/${post.id}`);
  };

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border bg-card overflow-hidden group h-full flex flex-col"
      onClick={handlePostClick}
    >
      {/* Image Section - Only show if there are images */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className="relative aspect-video w-full overflow-hidden">
          <img 
            src={post.imageUrls[0]} 
            alt="Post" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <CardHeader className="p-4 pb-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-ottoman-600 transition-colors">
          {post.title}
        </h3>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {truncatedContent}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t bg-muted/50 mt-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {/* Author and Date */}
          <div className="flex items-center gap-2 min-w-0">
            {post.author ? (
              <span
                onClick={e => { e.stopPropagation(); }}
                onMouseDown={e => e.stopPropagation()}
                className="inline-flex"
              >
                <UserProfileLink
                  userId={post.author.id}
                  username={post.author.username}
                  avatarUrl={post.author.avatarUrl}
                  size="sm"
                />
              </span>
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
              {format(new Date(post.createdAt), 'PP')}
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

export default ForumPostCard;
