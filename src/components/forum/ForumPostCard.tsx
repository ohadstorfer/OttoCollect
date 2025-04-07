
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ForumPost } from '@/types/forum';
import UserProfileLink from '@/components/common/UserProfileLink';

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
      className="hover:shadow-md transition-shadow cursor-pointer border"
      onClick={handlePostClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg line-clamp-2">{post.title}</h3>
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border">
              <img 
                src={post.imageUrls[0]} 
                alt="Post" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-muted-foreground text-sm line-clamp-2">
          {truncatedContent}
        </p>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between items-center text-muted-foreground text-xs">
        <div className="flex items-center gap-4">
          {post.author && (
            <UserProfileLink
              userId={post.author.id}
              username={post.author.username}
              avatarUrl={post.author.avatarUrl}
              size="sm"
            />
          )}
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(post.createdAt), 'PP')}
          </div>
        </div>
        <div className="flex items-center">
          <MessageSquare className="h-3 w-3 mr-1" />
          {post.commentCount || 0} comments
        </div>
      </CardFooter>
    </Card>
  );
};

export default ForumPostCard;
