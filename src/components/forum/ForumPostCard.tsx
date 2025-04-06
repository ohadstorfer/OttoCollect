
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ForumPost } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Calendar, Image } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ForumPostCardProps {
  post: ForumPost;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({ post }) => {
  // Format the date to be more readable
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  // Extract the first paragraph for excerpt
  const excerpt = post.content.split('\n')[0].substring(0, 150) + (post.content.length > 150 ? '...' : '');
  
  // Get the first image if available
  const firstImage = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : null;

  return (
    <Link to={`/community/forum/${post.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-md h-full flex flex-col">
        {firstImage && (
          <div className="relative w-full aspect-[16/9] overflow-hidden">
            <img 
              src={firstImage} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
            {post.imageUrls.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center">
                <Image className="h-3 w-3 mr-1" />
                +{post.imageUrls.length - 1}
              </div>
            )}
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author?.avatarUrl} />
              <AvatarFallback>{post.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{post.author?.username}</span>
            <Badge variant="outline" className="ml-auto">
              {post.author?.rank}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold line-clamp-2">{post.title}</h3>
        </CardHeader>
        <CardContent className="pb-4 flex-1">
          <p className="text-muted-foreground line-clamp-3 text-sm">{excerpt}</p>
        </CardContent>
        <CardFooter className="pt-2 border-t text-sm text-muted-foreground flex justify-between">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{post.commentCount || 0} comments</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};
