import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Save, X, Reply, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { updateForumComment, addForumComment } from '@/services/forumService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import UserProfileLink from '@/components/common/UserProfileLink';
import RankBadge from '@/components/common/RankBadge';
import { ForumComment as ForumCommentType } from '@/types/forum';
import { useTranslation } from 'react-i18next';
import { useDateLocale } from '@/lib/dateUtils';
import { useLanguage } from '@/context/LanguageContext';
import { CommentTranslationButton } from '@/components/forum/CommentTranslationButton';
import { forumTranslationService } from '@/services/forumTranslationService';

interface Author {
  id: string;
  username: string;
  avatarUrl?: string;
  rank?: string;
  role?: string;
}

interface ForumCommentProps {
  comment: ForumCommentType;
  onCommentUpdate?: () => void;
  depth?: number;
  maxDepth?: number;
}

export default function ForumComment({
  comment,
  onCommentUpdate,
  depth = 0,
  maxDepth = 3
}: ForumCommentProps) {
  console.log('🌐 [ForumComment] Component received comment:', {
    id: comment.id,
    content: comment.content?.substring(0, 50) + '...',
    author: comment.author?.username,
    depth,
    maxDepth
  });
  
  const { user } = useAuth();
  const { t } = useTranslation(['forum']);
  const { formatRelativeTime } = useDateLocale();
  const { currentLanguage, direction } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  
  // Translation state
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [showTranslatedComment, setShowTranslatedComment] = useState(false);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  const canEdit = user?.id === comment.author?.id;
  const canReply = user && depth < maxDepth;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isReply = depth > 0;

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error(tWithFallback('comments.emptyComment', 'Comment cannot be empty'));
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateForumComment(comment.id, editContent.trim());
      if (success) {
        setIsEditing(false);
        onCommentUpdate?.();
        toast.success(tWithFallback('notifications.commentUpdated', 'Comment updated successfully'));
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error(tWithFallback('comments.emptyReply', 'Reply cannot be empty'));
      return;
    }

    setIsSubmittingReply(true);
    try {
      const reply = await addForumComment(comment.post_id, replyContent.trim(), comment.id);
      if (reply) {
        setReplyContent('');
        setIsReplying(false);
        setShowReplies(true); // Show replies when adding a new one
        onCommentUpdate?.();
        toast.success(tWithFallback('notifications.replyAdded', 'Reply added successfully'));
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error(tWithFallback('notifications.error', 'Failed to add reply'));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleCancelReply = () => {
    setReplyContent('');
    setIsReplying(false);
  };

  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };
  
  return (
    <div className={`${depth > 0 ? 'mt-3' : ''}`}>
      {/* Wrap parent comment and replies with soft outline */}
      <div className={`
        ${depth === 0 && comment.replies && comment.replies.length > 0 
          ? 'border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/20' 
          : depth > 0 
            ? 'border-l-2 border-muted/60 pl-4 py-2 bg-muted/20' 
            : 'border border-muted/30 rounded-lg p-4 bg-card'
        }
      `}>
        
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <UserProfileLink
              userId={comment.author?.id || ''}
              username={comment.author?.username || tWithFallback('content.unknown', 'Unknown')}
              avatarUrl={comment.author?.avatarUrl}
              size="sm"
            />
            <RankBadge rank={comment.author?.rank as any} size="sm" userRole={comment.author?.role} />

          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span>
              {formatRelativeTime(comment.createdAt)}
              {comment.isEdited && <span className="ml-1 italic">({tWithFallback('content.edited', 'edited')})</span>}
            </span>
            {canEdit && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none "
              placeholder={tWithFallback('forms.commentPlaceholder', 'Write your comment...')}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving || !editContent.trim()}
              >
                <Save className="h-3 w-3 mr-1" />
                {isSaving ? tWithFallback('status.saving', 'Saving...') : tWithFallback('actions.save', 'Save')}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3 w-3 mr-1" />
                {tWithFallback('actions.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="prose prose-sm max-w-none">
              <p className={`text-sm whitespace-pre-wrap leading-relaxed break-words overflow-hidden ${
                direction === 'rtl' ? 'text-right' : ''
              }`}>
                {showTranslatedComment && translatedContent ? translatedContent : comment.content}
              </p>
            </div>
            
            {/* Comment Translation Button */}
            <div className={`${direction === 'rtl' ? 'text-right' : ''}`}>
              {console.log('🌐 [ForumComment] About to render CommentTranslationButton with:', {
                commentId: comment.id,
                commentContent: comment.content?.substring(0, 30) + '...',
                showTranslatedComment,
                translatedContent: translatedContent?.substring(0, 30) + '...'
              })}
              {console.log('🌐 [ForumComment] Rendering CommentTranslationButton now')}
              <CommentTranslationButton
                commentId={comment.id}
                commentType="forum_comments"
                currentContent={showTranslatedComment && translatedContent ? translatedContent : comment.content}
                originalContent={comment.content}
                isShowingTranslation={showTranslatedComment}
                onTranslated={(content) => {
                  if (content === comment.content) {
                    // Show original
                    setShowTranslatedComment(false);
                  } else {
                    // Show translation
                    setTranslatedContent(content);
                    setShowTranslatedComment(true);
                  }
                }}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {canReply && !isReplying && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplying(true)}
                  className="text-xs h-7 px-2 hover:bg-muted"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  {tWithFallback('actions.reply', 'Reply')}
                </Button>
              )}
              
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleReplies}
                  className="text-xs h-7 px-2 hover:bg-muted"
                >
                  {showReplies ? (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {tWithFallback('comments.hideReplies', 'Hide {{count}} replies', { count: comment.replies?.length })}
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {tWithFallback('comments.showReplies', 'Show {{count}} replies', { count: comment.replies?.length })}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-4 space-y-3 border-t pt-3">

            <Textarea 
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] resize-none"
              placeholder={tWithFallback('forms.replyPlaceholder', 'Reply to {{username}}...', { username: comment.author?.username || tWithFallback('content.unknown', 'Unknown') })}
              autoFocus
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleReply}
                disabled={isSubmittingReply || !replyContent.trim()}
              >
                {isSubmittingReply ? tWithFallback('status.posting', 'Posting...') : tWithFallback('actions.postReply', 'Post Reply')}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCancelReply}
                disabled={isSubmittingReply}
              >
                {tWithFallback('actions.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {hasReplies && showReplies && (
        <div className="mt-3 space-y-2">
          {comment.replies.map((reply) => (
            <ForumComment
              key={reply.id}
              comment={reply}
              onCommentUpdate={onCommentUpdate}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}