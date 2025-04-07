
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createForumComment } from "@/services/forumService";
import { useToast } from "@/hooks/use-toast";
import { ForumComment } from "@/types";

interface AddCommentFormProps {
  postId: string;
  onCommentAdded: (comment: ForumComment) => void;
}

export const AddCommentForm: React.FC<AddCommentFormProps> = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to comment.",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const commentId = await createForumComment(postId, content);
      
      // Create a new comment object to add to the UI
      const newComment: ForumComment = {
        id: commentId,
        postId,
        content,
        authorId: user.id,
        author: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          rank: user.rank
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      onCommentAdded(newComment);
      setContent("");
      toast({
        description: "Comment added successfully",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[100px]"
          />
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting || !content.trim()}
            >
              Post Comment
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AddCommentForm;
