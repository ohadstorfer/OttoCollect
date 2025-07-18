import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ForumPost } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: string;
}

interface ForumPostWithAuthor extends Omit<ForumPost, 'author'> {
  author: Author;
  commentCount?: number;
}

interface ForumPostCardProps {
  post: ForumPostWithAuthor;
}

const ForumPostCard = ({ post }: ForumPostCardProps) => {
  const navigate = useNavigate();

  const handlePostClick = () => {
    navigate(`/community/forum/${post.id}`);
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
              <span>{post.title}</span>
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <UserProfileLink
                userId={post.author.id}
                username={post.author.username}
                avatarUrl={post.author.avatarUrl}
                size="sm"
              />
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(post.created_at), 'MMM d, yyyy')}
              </div>
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