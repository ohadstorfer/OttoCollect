
import React, { useState } from "react";
import { ForumComment as ForumCommentType } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { updateForumComment, deleteForumComment } from "@/services/forumService";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, X } from "lucide-react";
interface ForumCommentProps {
  comment: ForumCommentType;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, newContent: string) => void;
}
export const ForumCommentComponent: React.FC<ForumCommentProps> = ({
  comment,
  onDelete,
  onUpdate
}) => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formattedDate = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true
  });
  const isOwner = user?.id === comment.authorId;
  const handleUpdateComment = async () => {
    if (!editContent.trim()) return;
    setIsSubmitting(true);
    try {
      await updateForumComment(comment.id, editContent);
      onUpdate(comment.id, editContent);
      setIsEditing(false);
      toast({
        description: "Comment updated successfully"
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update comment. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteComment = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setIsSubmitting(true);
    try {
      await deleteForumComment(comment.id);
      onDelete(comment.id);
      toast({
        description: "Comment deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete comment. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="flex gap-3 py-4 border-b last:border-0 my-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.author?.avatarUrl} />
        <AvatarFallback>{comment.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm">{comment.author?.username}</span>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
        
        {isEditing ? <div className="space-y-2">
            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[100px]" disabled={isSubmitting} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdateComment} disabled={isSubmitting || !editContent.trim()}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
            setIsEditing(false);
            setEditContent(comment.content);
          }} disabled={isSubmitting}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div> : <>
            <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
            
            {isOwner && <div className="flex gap-0 mt-2 my">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 px-2">
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDeleteComment} className="h-7 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>}
          </>}
      </div>
    </div>;
};
