
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types";
import { ForumComment } from "@/types/forum";
import { addForumComment } from '@/services/forumService';
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";

interface AddCommentFormProps {
  postId: string;
  user: User;
  onCommentAdded: (comment: ForumComment) => void;
}

export default function AddCommentForm({ postId, user, onCommentAdded }: AddCommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (content.trim() === '') return;
    
    setIsSubmitting(true);
    try {
      const comment = await addForumComment(postId, content, user.id);
      
      if (comment) {
        onCommentAdded(comment);
        setContent('');
        toast({
          title: "Comment added",
          description: "Your comment has been added successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback className="bg-ottoman-700 text-parchment-100">
          {getInitials(user.username)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <Textarea 
          placeholder="Write your comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="resize-none"
        />
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || content.trim() === ''}
            size="sm"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
