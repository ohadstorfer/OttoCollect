import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserProfileLink } from "@/components/user/UserProfileLink";
import { ImageGallery } from "@/components/shared/ImageGallery";
import { ForumPostWithAuthor } from '@/types';

interface ForumPostCardProps {
  post: ForumPostWithAuthor;
  showFullContent?: boolean;
}

const ForumPostCard = ({ post, showFullContent = false }: ForumPostCardProps) => {
  const navigate = useNavigate();
  
  const handleViewPost = () => {
    navigate(`/forum/post/${post.id}`);
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <UserProfileLink
                userId={post.author_id}
                username={post.profiles?.username || 'Unknown'}
                avatarUrl={post.profiles?.avatar_url}
                rank={post.profiles?.rank}
              />
            </div>
            
            <div className="space-y-3">
              {/* Post Images */}
              {post.image_urls && post.image_urls.length > 0 && (
                <div className="space-y-2">
                  <ImageGallery images={post.image_urls} />
                </div>
              )}
              
              <h3 className="text-lg font-semibold">{post.title}</h3>
              
              <div className="prose prose-sm max-w-none">
                {showFullContent ? (
                  <p>{post.content}</p>
                ) : (
                  <p className="line-clamp-3">{post.content}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{format(new Date(post.created_at), 'PPp')}</span>
                <div className="flex items-center space-x-4">
                  <span>{post.forum_comments?.length || 0} comments</span>
                  {!showFullContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewPost}
                      className="text-primary hover:text-primary/80"
                    >
                      View Post →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumPostCard;
