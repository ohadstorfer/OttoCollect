import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types";
import { BlogComment } from "@/types/blog";
import { addBlogComment, checkUserDailyBlogLimit } from '@/services/blogService';
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface AddCommentFormProps {
  postId: string;
  user: User;
  onCommentAdded: (comment: BlogComment) => void;
}

export default function AddCommentForm({ postId, user, onCommentAdded }: AddCommentFormProps) {
  const { t } = useTranslation(['blog']);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const { toast } = useToast();

  // Check if user is in limited ranks
  const isLimitedRank = ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '');

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!isLimitedRank) return;
      
      try {
        const { hasReachedLimit: limitReached, dailyCount: count } = await checkUserDailyBlogLimit(user.id);
        setHasReachedLimit(limitReached);
        setDailyCount(count);
      } catch (error) {
        console.error('Error checking daily limit:', error);
      }
    };

    checkDailyLimit();
  }, [user.id, isLimitedRank]);

  const handleSubmit = async () => {
    if (content.trim() === '') return;
    
    // Check limit before submitting
    if (isLimitedRank) {
      const { hasReachedLimit: limitReached } = await checkUserDailyBlogLimit(user.id);
      if (limitReached) {
        toast({
          title: tWithFallback('status.dailyLimitReached', 'Daily limit reached'),
          description: tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 3 blog activities (posts + comments).'),
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const comment = await addBlogComment(postId, content);
      
      if (comment) {
        onCommentAdded(comment);
        setContent('');
        
        // Update daily count after successful comment
        if (isLimitedRank) {
          setDailyCount(prev => prev + 1);
          if (dailyCount + 1 >= 6) {
            setHasReachedLimit(true);
          }
        }
        
        toast({
          title: tWithFallback('notifications.commentAdded', 'Comment added'),
          description: tWithFallback('notifications.commentAdded', 'Your comment has been added successfully.'),
        });
      } else {
        toast({
          title: tWithFallback('notifications.error', 'Error'),
          description: tWithFallback('notifications.failedToAddComment', 'Failed to add comment. Please try again.'),
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
        {isLimitedRank && hasReachedLimit && (
          <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 text-sm">
              {tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 3 blog activities (posts + comments).')}
            </p>
          </div>
        )}
        
        {isLimitedRank && !hasReachedLimit && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
            <p className="text-yellow-600 dark:text-yellow-400 text-sm">
              {tWithFallback('limits.dailyActivity', 'Daily blog activity: {{count}}/3 (posts + comments)', { count: dailyCount })}
            </p>
          </div>
        )}
        
        <Textarea 
          placeholder={tWithFallback('forms.commentPlaceholder', 'Write your comment...')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="resize-none"
          disabled={hasReachedLimit}
        />
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || content.trim() === '' || hasReachedLimit}
            size="sm"
          >
            {isSubmitting ? tWithFallback('status.posting', 'Posting...') : tWithFallback('actions.postComment', 'Post Comment')}
          </Button>
        </div>
      </div>
    </div>
  );
}