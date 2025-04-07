
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Edit2, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ForumComment as ForumCommentType } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { updateForumComment, deleteForumComment } from '@/services/forumService';
import { useToast } from '@/hooks/use-toast';

interface ForumCommentProps {
  comment: ForumCommentType;
  onUpdate?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
}

const ForumComment = ({ comment, onUpdate, onDelete }: ForumCommentProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if the current user can edit this comment
  const canModify = user && (
    user.id === comment.authorId || 
    ['Admin', 'Super Admin'].includes(user.role || '')
  );

  const handleSaveEdit = async () => {
    if (editedContent.trim() === '') return;
    setIsSubmitting(true);
    
    try {
      await updateForumComment(comment.id, editedContent);
      
      if (onUpdate) {
        onUpdate(comment.id, editedContent);
      } else {
        // If no callback provided, update directly
        comment.content = editedContent;
        comment.isEdited = true;
      }
      
      setIsEditing(false);
      toast({
        description: "Comment updated successfully",
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update comment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    
    try {
      await deleteForumComment(comment.id);
      
      if (onDelete) {
        onDelete(comment.id);
      }
      
      toast({
        description: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete comment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(comment.content);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {comment.author && (
              <UserProfileLink
                userId={comment.author.id}
                username={comment.author.username}
                avatarUrl={comment.author.avatarUrl}
                rank={comment.author.rank}
                showRank={true}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-muted-foreground text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(comment.createdAt), 'PP')}
              {comment.isEdited && <span className="ml-1 italic">(edited)</span>}
            </div>
            
            {canModify && !isEditing && (
              <div className="flex items-center ml-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                
                <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-600"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-3 w-3" />
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
        
        <div className="ml-10">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea 
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                disabled={isSubmitting}
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || editedContent.trim() === ''}
                >
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            comment.content.split('\n').map((paragraph, index) => (
              <p key={index} className={index > 0 ? "mt-2" : ""}>
                {paragraph}
              </p>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumComment;
