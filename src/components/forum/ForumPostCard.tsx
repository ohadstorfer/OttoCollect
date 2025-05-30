
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserProfileLink from '@/components/common/UserProfileLink';
import RankBadge from '@/components/common/RankBadge';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: string;
  role?: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: Author;
  createdAt: string;
  commentCount?: number;
  imageUrls?: string[];
}

interface ForumPostCardProps {
  post: ForumPost;
}

export default function ForumPostCard({ post }: ForumPostCardProps) {
  const truncatedContent = post.content.length > 150 
    ? post.content.substring(0, 150) + '...' 
    : post.content;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <UserProfileLink
                userId={post.author.id}
                username={post.author.username}
                avatarUrl={post.author.avatarUrl}
                size="sm"
              />
              <RankBadge rank={post.author.rank as any} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div>
            <Link to={`/forum/post/${post.id}`}>
              <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-2">
                {post.title}
              </h3>
            </Link>
            <p className="text-muted-foreground text-sm line-clamp-3">
              {truncatedContent}
            </p>
          </div>

          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="flex gap-2">
              {post.imageUrls.slice(0, 3).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Post image ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border"
                />
              ))}
              {post.imageUrls.length > 3 && (
                <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                  +{post.imageUrls.length - 3}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{post.commentCount || 0} comments</span>
            </div>
            <Link to={`/forum/post/${post.id}`}>
              <Button variant="outline" size="sm">
                Read More
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
