import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageSquare, Calendar, User } from 'lucide-react';
import { BlogPost } from '@/types/blog';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';
import { useDateLocale, DATE_FORMATS } from '@/lib/dateUtils';

interface BlogPostCardProps {
  post: BlogPost;
}

const BlogPostCard = ({ post }: BlogPostCardProps) => {
  const navigate = useNavigate();
  const { formatDate } = useDateLocale();

  const handlePostClick = () => {
    navigate(`/blog/${post.id}`);
  };

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
            alt={post.title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <CardHeader className="p-4 pb-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-ottoman-600 transition-colors">
          <span>{post.title}</span>
        </h3>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {post.excerpt || (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content)}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t bg-muted/50 mt-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {/* Author and Date */}
          <div className="flex items-center gap-2 min-w-0">
            {post.author ? (
              <UserProfileLink
                userId={post.author.id}
                username={post.author.username}
                avatarUrl={post.author.avatarUrl}
                size="sm"
              />
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