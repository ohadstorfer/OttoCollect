import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, User } from "lucide-react";
import { format, isValid, parseISO } from 'date-fns';
import { ForumPost } from '@/types/forum';
import { cn } from '@/lib/utils';

interface LatestForumPostsProps {
  posts: ForumPost[];
  loading?: boolean;
}

const LatestForumPosts = ({ posts, loading = false }: LatestForumPostsProps) => {
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-500"></div>
      </div>
    );
  }
  
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ottoman-300">No forum posts available.</p>
        <Button 
          onClick={() => navigate('/community/forum/new')}
          className="mt-4"
        >
          Create the first post
        </Button>
      </div>
    );
  }
  
  const handlePostClick = (postId: string) => {
    navigate(`/community/forum/${postId}`);
  };
  
  // Function to safely format dates
  const safeFormatDate = (dateString: string) => {
    try {
      // Parse the ISO string to a Date object first
      const date = parseISO(dateString);
      // Check if the resulting date is valid before formatting
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
      return 'Unknown date';
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Unknown date';
    }
  };

  return (
    <>
      {/* Floating animation keyframes */}
      <style>{`
        @keyframes floatRotate {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }
      `}</style>
  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <div 
            key={post.id} 
            className={cn(
              "glass-card p-5 cursor-pointer hover:shadow-lg transition-all border border-ottoman-800/50",
              index % 2 === 0 ? "fade-right" : "fade-left"
            )}
            style={{
              animation: "floatRotate 4s ease-in-out infinite",
              animationDelay: `${index * 150}ms`
            }}
            onClick={() => handlePostClick(post.id)}
          >
            <div className="flex items-start gap-3 h-full">
              {post.author?.avatarUrl ? (
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-ottoman-700">
                  <img 
                    src={post.author.avatarUrl} 
                    alt={post.author.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-ottoman-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-parchment-100" />
                </div>
              )}
              
              <div className="flex-1 min-w-0 flex flex-col">
                <h3 className="font-serif font-semibold text-lg text-parchment-400 line-clamp-2 mb-2">
                  {post.title}
                </h3>
                
                <div className="flex items-center text-xs text-ottoman-300 gap-3 mb-2">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {safeFormatDate(post.createdAt)}
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {post.commentCount || 0} comments
                  </div>
                </div>
                
                <p className="text-sm text-ottoman-200 line-clamp-2 break-words overflow-hidden">
                  {post.content}
                </p>
                
                {post.author && (
                  <div className="mt-auto pt-2 text-xs text-ottoman-400">
                    By {post.author.username || 'Anonymous'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default LatestForumPosts;
