import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from '@/components/forum/ImageUploader';
import { createForumAnnouncement, checkUserDailyForumLimit } from '@/services/forumService';
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

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnnouncementCreated?: (announcementId: string) => void;
}

export function CreateAnnouncementDialog({ open, onOpenChange, onAnnouncementCreated }: CreateAnnouncementDialogProps) {
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



  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  // Check if user is Super Admin
  const isSuperAdmin = user?.role === 'Super Admin';

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

    if (!isSuperAdmin) {
      toast({
        title: t('limits.accessDenied'),
        description: t('limits.accessDenied'),
        variant: "destructive",
      });
      return;
    }

    // Check limit before submitting
    if (isLimitedRank) {
      const { hasReachedLimit: limitReached } = await checkUserDailyForumLimit(user.id);
      if (limitReached) {
        toast({
          title: t('status.dailyLimitReached'),
          description: t('limits.dailyLimitWarning'),
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newAnnouncement = await createForumAnnouncement(title, content, user.id, images);
      
      if (newAnnouncement) {
        toast({
          title: t('notifications.announcementCreated'),
          description: t('notifications.announcementCreated'),
        });
        
        // Reset form
        setTitle('');
        setContent('');
        setImages([]);
        
        // Close dialog
        onOpenChange(false);
        
        // Callback to refresh announcements or navigate
        if (onAnnouncementCreated) {
          onAnnouncementCreated(newAnnouncement.id);
        } else {
          navigate(`/forum-announcements`);
        }
      } else {
        toast({
          variant: "destructive",
          title: t('notifications.error'),
          description: t('notifications.failedToCreatePost'),
        });
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({
        variant: "destructive",
        title: t('notifications.error'),
        description: t('notifications.unexpectedError'),
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
            <span>{t('forms.createNewAnnouncement')}</span>
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
          {!isSuperAdmin && (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">
                {t('limits.accessDenied')}
              </p>
            </div>
          )}
          
          {isLimitedRank && hasReachedLimit && (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">
                {t('limits.dailyLimitWarning')}
              </p>
            </div>
          )}
          
          {isLimitedRank && !hasReachedLimit && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                {t('limits.dailyActivity', { count: dailyCount })}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">
              <span>{t('forms.announcementTitle')}</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('forms.announcementTitlePlaceholder')}
              required
              maxLength={100}
              disabled={hasReachedLimit || !isSuperAdmin}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">{t('forms.announcementContent')}</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('forms.announcementContentPlaceholder')}
              required
              className="min-h-[200px] resize-none"
              disabled={hasReachedLimit || !isSuperAdmin}
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t('forms.imagesLabel')}</Label>
            <ImageUploader images={images} onChange={setImages} disabled={hasReachedLimit || !isSuperAdmin} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t('forms.cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim() || hasReachedLimit || !isSuperAdmin}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('forms.publishing')}
                </>
              ) : (
                t('forms.publishAnnouncement')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 