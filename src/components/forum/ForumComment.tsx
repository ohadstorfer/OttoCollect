
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Save, X } from 'lucide-react';
import { updateForumComment } from '@/services/forumService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import UserProfileLink from '@/components/common/UserProfileLink';
import RankBadge from '@/components/common/RankBadge';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: string;
  role?: string;
}

interface ForumCommentProps {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  isEdited?: boolean;
  onCommentUpdate?: () => void;
}

export default function ForumComment({
  id,
  content,
  author,
  createdAt,
  isEdited = false,
  onCommentUpdate
}: ForumCommentProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = user?.id === author.id;

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateForumComment(id, editContent.trim());
      if (success) {
        setIsEditing(false);
        onCommentUpdate?.();
        toast.success('Comment updated successfully');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  return (
    <div className="border-l-2 border-muted pl-4 py-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <UserProfileLink
            userId={author.id}
            username={author.username}
            avatarUrl={author.avatarUrl}
            size="sm"
          />
          <RankBadge rank={author.rank as any} size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
            {isEdited && <span className="ml-1">(edited)</span>}
          </span>
          {canEdit && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px]"
            placeholder="Write your comment..."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !editContent.trim()}
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}
