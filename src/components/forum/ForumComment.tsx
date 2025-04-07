
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ForumComment } from "@/types/forum";
import { useAuth } from "@/context/AuthContext";
import { UserProfileLink } from "@/components/common/UserProfileLink";
import { Edit2, Trash2 } from "lucide-react";
import { updateForumComment, deleteForumComment } from "@/services/forumService";
import { getInitials } from '@/lib/utils';

interface CommentProps {
  comment: ForumComment;
  onCommentUpdated: (updatedComment: ForumComment) => void;
  onCommentDeleted: (commentId: string) => void;
}

export function Comment({ comment, onCommentUpdated, onCommentDeleted }: CommentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isAuthor = user?.id === comment.authorId;
  
  // Format date for display
  const formattedDate = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  
  // Handle comment edit
  const handleSaveEdit = async () => {
    if (!user || !isAuthor || editedContent.trim() === '') return;
    
    setIsSubmitting(true);
    try {
      const updatedComment = await updateForumComment(comment.id, user.id, editedContent);
      
      if (updatedComment) {
        onCommentUpdated(updatedComment);
        setIsEditing(false);
        toast({
          title: "Comment updated",
          description: "Your comment has been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle comment deletion
  const handleDelete = async () => {
    if (!user || !isAuthor) return;
    
    setIsSubmitting(true);
    try {
      const success = await deleteForumComment(comment.id, user.id);
      
      if (success) {
        onCommentDeleted(comment.id);
        toast({
          title: "Comment deleted",
          description: "Your comment has been deleted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="py-4 border-b last:border-b-0">
      <div className="flex gap-3">
        <UserProfileLink userId={comment.authorId}>
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={comment.author?.avatarUrl} />
            <AvatarFallback className="bg-ottoman-700 text-parchment-100">
              {comment.author?.username ? getInitials(comment.author.username) : '??'}
            </AvatarFallback>
          </Avatar>
        </UserProfileLink>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <UserProfileLink userId={comment.authorId}>
              <span className="font-semibold">{comment.author?.username || 'Unknown User'}</span>
            </UserProfileLink>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            {comment.isEdited && <span className="text-xs italic text-muted-foreground">(edited)</span>}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea 
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || editedContent.trim() === ''}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <p className="whitespace-pre-line">{comment.content}</p>
            </div>
          )}
          
          {isAuthor && !isEditing && (
            <div className="flex gap-2 mt-2 justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={16} className="mr-1" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this comment? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
