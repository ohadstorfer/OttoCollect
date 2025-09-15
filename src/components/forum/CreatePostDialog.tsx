import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from '@/components/forum/ImageUploader';
import { createForumPost, checkUserDailyForumLimit } from '@/services/forumService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: (postId: string) => void;
}

export function CreatePostDialog({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['forum']);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user || !isLimitedRank) return;
      
      try {
        const { hasReachedLimit: limitReached, dailyCount: count } = await checkUserDailyForumLimit(user.id);
        setHasReachedLimit(limitReached);
        setDailyCount(count);
      } catch (error) {
        console.error('Error checking daily limit:', error);
      }
    };

    checkDailyLimit();
  }, [user, isLimitedRank]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !title.trim() || !content.trim()) {
      return;
    }

    // Check limit before submitting
    if (isLimitedRank) {
      const { hasReachedLimit: limitReached } = await checkUserDailyForumLimit(user.id);
      if (limitReached) {
        toast({
          title: tWithFallback('status.dailyLimitReached', 'Daily limit reached'),
          description: tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 6 forum activities (posts + comments).'),
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newPost = await createForumPost(title, content, user.id, images);
      
      if (newPost) {
        toast({
          title: tWithFallback('notifications.postCreated', 'Success'),
          description: tWithFallback('notifications.postCreated', 'Your post has been published successfully.'),
        });
        
        // Reset form
        setTitle('');
        setContent('');
        setImages([]);
        
        // Close dialog
        onOpenChange(false);
        
        // Callback to refresh posts or navigate
        if (onPostCreated) {
          onPostCreated(newPost.id);
        } else {
          navigate(`/forum-post/${newPost.id}`);
        }
      } else {
        toast({
          variant: "destructive",
          title: tWithFallback('notifications.error', 'Error'),
          description: tWithFallback('notifications.failedToCreatePost', 'Failed to create post. Please try again.'),
        });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: tWithFallback('notifications.error', 'Error'),
        description: tWithFallback('notifications.unexpectedError', 'An unexpected error occurred. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setImages([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{tWithFallback('forms.createNewPost', 'Create New Forum Post')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {isLimitedRank && hasReachedLimit && (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">
                {tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 6 forum activities (posts + comments).')}
              </p>
            </div>
          )}
          
          {isLimitedRank && !hasReachedLimit && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                {tWithFallback('limits.dailyActivity', 'Daily forum activity: {{count}}/6 (posts + comments)', { count: dailyCount })}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">{tWithFallback('forms.titleLabel', 'Title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tWithFallback('forms.titlePlaceholder', 'Add a descriptive title for your post')}
              required
              maxLength={100}
              disabled={hasReachedLimit}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">{tWithFallback('forms.contentLabel', 'Content')}</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={tWithFallback('forms.contentPlaceholder', 'Share your thoughts, questions, or insights...')}
              required
              className="min-h-[200px] resize-none"
              disabled={hasReachedLimit}
            />
          </div>
          
          <div className="space-y-2">
            <Label>{tWithFallback('forms.imagesLabel', 'Images (Optional)')}</Label>
            <ImageUploader images={images} onChange={setImages} disabled={hasReachedLimit} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {tWithFallback('actions.cancel', 'Cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim() || hasReachedLimit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tWithFallback('status.publishing', 'Publishing...')}
                </>
              ) : (
                tWithFallback('forms.publishPost', 'Publish Post')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 