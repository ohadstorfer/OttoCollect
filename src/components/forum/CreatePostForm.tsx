
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from '@/components/forum/ImageUploader';
import { createForumPost, checkUserDailyForumLimit } from '@/services/forumService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function CreatePostForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

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
          title: "Daily limit reached",
          description: "You have reached your daily limit of 6 forum activities (posts + comments).",
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
          title: "Success",
          description: "Your post has been published successfully.",
        });
        navigate(`/community/forum/${newPost.id}`);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create post. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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
                You have reached your daily limit of 6 forum activities (posts + comments).
              </p>
            </div>
          )}
          
          {isLimitedRank && !hasReachedLimit && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-600 dark:text-yellow-400">
                Daily forum activity: {dailyCount}/6 (posts + comments)
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a descriptive title for your post"
              required
              maxLength={100}
              disabled={hasReachedLimit}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, questions, or insights..."
              required
              className="min-h-[200px]"
              disabled={hasReachedLimit}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Images (Optional)</Label>
            <ImageUploader images={images} onChange={setImages} disabled={hasReachedLimit} />
          </div>
        </CardContent>
        
        <CardFooter className="px-6 py-4 border-t flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/community/forum')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim() || hasReachedLimit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Post'
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
