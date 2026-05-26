import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { createBlogPost, checkUserDailyBlogLimit, uploadBlogImage } from '@/services/blogService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { blogTranslationService } from '@/services/blogTranslationService';
import { buildExcerpt, isContentEmpty, getFirstImageSrc } from '@/lib/htmlContent';

export function CreatePostForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['blog']);
  const { direction } = useLanguage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user || !isLimitedRank) return;
      
      try {
        const { hasReachedLimit: limitReached, dailyCount: count } = await checkUserDailyBlogLimit(user.id);
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
    
    if (!user || !title.trim() || isContentEmpty(content)) {
      return;
    }

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
      // Generate a plain-text excerpt from the rich-text content (first 150 chars)
      const excerpt = buildExcerpt(content, 150);
      // Use the first image embedded in the content as the post's main image.
      const mainImage = getFirstImageSrc(content) || '';
      const newPost = await createBlogPost(title, content, excerpt, mainImage, user.id);
      
      if (newPost) {
        // Detect and save original language
        await blogTranslationService.detectAndSaveOriginalLanguage(
          title,
          content,
          excerpt,
          newPost.id
        );
        
        toast({
          title: tWithFallback('notifications.postCreated', 'Success'),
          description: tWithFallback('notifications.postCreated', 'Your blog post has been published successfully.'),
        });
        navigate(`/blog-post/${newPost.id}`);
      } else {
        toast({
          variant: "destructive",
          title: tWithFallback('notifications.error', 'Error'),
          description: tWithFallback('notifications.failedToCreatePost', 'Failed to create blog post. Please try again.'),
        });
      }
    } catch (error) {
      console.error("Error creating blog post:", error);
      toast({
        variant: "destructive",
        title: tWithFallback('notifications.error', 'Error'),
        description: tWithFallback('notifications.unexpectedError', 'An unexpected error occurred. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-6">
          {isLimitedRank && hasReachedLimit && (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">
                {tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 3 blog activities (posts + comments).')}
              </p>
            </div>
          )}
          
          {isLimitedRank && !hasReachedLimit && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-600 dark:text-yellow-400">
                {t('limits.dailyActivity', { count: dailyCount })}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title" className={`block w-full ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>{tWithFallback('forms.titleLabel', 'Title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tWithFallback('forms.titlePlaceholder', 'Add a descriptive title for your blog post')}
              required
              maxLength={100}
              disabled={hasReachedLimit}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content" className={`block w-full ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>{tWithFallback('forms.contentLabel', 'Content')}</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder={tWithFallback('forms.contentPlaceholder', 'Write your blog post content...')}
              disabled={hasReachedLimit}
              dir={direction === 'rtl' ? 'rtl' : 'ltr'}
              onImageUpload={uploadBlogImage}
            />
          </div>
        </CardContent>
        
        <CardFooter className="px-6 py-4 border-t flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/blog')}
            disabled={isSubmitting}
          >
            {tWithFallback('actions.cancel', 'Cancel')}
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting || !title.trim() || isContentEmpty(content) || hasReachedLimit}
          >
                          {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tWithFallback('status.publishing', 'Publishing...')}
                </>
              ) : (
                tWithFallback('forms.publishPost', 'Publish Blog Post')
              )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}