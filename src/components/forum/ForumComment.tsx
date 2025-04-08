
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
import { Edit2, Trash2 } from "lucide-react";
import { editComment, deleteComment } from "@/services/forumService";
import { getInitials } from '@/lib/utils';

interface CommentProps {
  comment: ForumComment;
  currentUserId: string;
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
}

function Comment({ comment, currentUserId, onUpdate, onDelete }: CommentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isAuthor = currentUserId === comment.authorId;
  
  // Format date for display
  const formattedDate = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  
  // Handle comment edit
  const handleSaveEdit = async () => {
    if (!user || !isAuthor || editedContent.trim() === '') return;
    
    setIsSubmitting(true);
    try {
      const updatedComment = await editComment(comment.id, editedContent, user.id);
      
      if (updatedComment) {
        onUpdate(comment.id, editedContent);
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
      const success = await deleteComment(comment.id, user.id);
      
      if (success) {
        onDelete(comment.id);
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
    <div className="py-4 border-b last:border-b-0 animate-fade-in transition-all duration-300">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={comment.author?.avatarUrl} />
            <AvatarFallback className="bg-ottoman-700 text-parchment-100">
              {comment.author?.username ? getInitials(comment.author.username) : '??'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{comment.author?.username || 'Unknown User'}</span>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            {comment.isEdited && <span className="text-xs italic text-muted-foreground">(edited)</span>}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2 animate-scale-in">
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
            <div className="flex gap-2 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-ottoman-600 hover:text-ottoman-700 hover:bg-ottoman-100/50"
              >
                <Edit2 size={16} className="mr-1" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
                  >
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
                    <AlertDialogAction 
                      onClick={handleDelete} 
                      disabled={isSubmitting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
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

export default Comment;
