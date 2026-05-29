import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  fetchMyBlogDrafts,
  checkUserDailyBlogLimit,
  uploadBlogImage,
} from '@/services/blogService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, FileText, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { blogTranslationService } from '@/services/blogTranslationService';
import { buildExcerpt, isContentEmpty, getFirstImageSrc } from '@/lib/htmlContent';
import type { BlogPost } from '@/types';

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
  const [showExitDialog, setShowExitDialog] = useState(false);
  // When set, "Save draft" updates this row instead of inserting a new one.
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  // Snapshot of the loaded draft so we can detect if the user actually edited
  // anything (no false-positive unsaved-changes guard when just opening).
  const [draftBaseline, setDraftBaseline] = useState<{ title: string; content: string } | null>(null);
  const [myDrafts, setMyDrafts] = useState<BlogPost[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

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

  // Load the user's drafts so they can resume editing one.
  const loadDrafts = useCallback(async () => {
    if (!user) return;
    setIsLoadingDrafts(true);
    try {
      const drafts = await fetchMyBlogDrafts(user.id);
      setMyDrafts(drafts);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [user]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // "Unsaved work" semantics:
  //  - Brand new post: any title/content typed counts.
  //  - Editing an existing draft: only counts if title/content diverged from
  //    the loaded baseline. Opening a draft without changes should not trigger
  //    the exit guard.
  const hasUnsavedWork = useMemo(() => {
    if (editingDraftId && draftBaseline) {
      return title !== draftBaseline.title || content !== draftBaseline.content;
    }
    return title.trim().length > 0 || !isContentEmpty(content);
  }, [editingDraftId, draftBaseline, title, content]);

  const canSubmit = !!user && title.trim().length > 0 && !isContentEmpty(content);

  // Native browser confirm when closing the tab / refreshing.
  useEffect(() => {
    if (!hasUnsavedWork || isSubmitting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedWork, isSubmitting]);

  // Intercept the browser back button via a marker history entry. (v6
  // BrowserRouter has no useBlocker, so this is the pragmatic workaround;
  // covers back/forward but not clicks on in-app nav links.)
  useEffect(() => {
    if (!hasUnsavedWork || isSubmitting) return;
    window.history.pushState({ blogDraftGuard: true }, '', window.location.href);
    const handlePopState = () => {
      setShowExitDialog(true);
      window.history.pushState({ blogDraftGuard: true }, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedWork, isSubmitting]);

  const loadDraftIntoForm = (draft: BlogPost) => {
    setTitle(draft.title || '');
    setContent(draft.content || '');
    setDraftBaseline({ title: draft.title || '', content: draft.content || '' });
    setEditingDraftId(draft.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDraft = async (draftId: string) => {
    const confirmed = window.confirm(
      tWithFallback('forms.deleteDraftConfirm', 'Delete this draft permanently?')
    );
    if (!confirmed) return;
    const ok = await deleteBlogPost(draftId);
    if (ok) {
      setMyDrafts((drafts) => drafts.filter((d) => d.id !== draftId));
      if (editingDraftId === draftId) {
        setEditingDraftId(null);
        setDraftBaseline(null);
        setTitle('');
        setContent('');
      }
      toast({
        title: tWithFallback('notifications.draftDeleted', 'Draft deleted'),
      });
    } else {
      toast({
        variant: 'destructive',
        title: tWithFallback('notifications.error', 'Error'),
        description: tWithFallback('notifications.draftDeleteFailed', 'Could not delete the draft.'),
      });
    }
  };

  // Core save: persists the post. `asDraft=true` keeps it private (is_draft);
  // `asDraft=false` publishes it. Used by the footer Publish button and by
  // the exit dialog (which always saves as draft).
  const performSave = useCallback(async (asDraft: boolean): Promise<boolean> => {
    if (!canSubmit || !user) return false;

    // Daily-activity quota only applies to new published posts — updating an
    // existing row or just saving as draft shouldn't count as a new activity.
    if (isLimitedRank && !editingDraftId && !asDraft) {
      const { hasReachedLimit: limitReached } = await checkUserDailyBlogLimit(user.id);
      if (limitReached) {
        toast({
          title: tWithFallback('status.dailyLimitReached', 'Daily limit reached'),
          description: tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 3 blog activities (posts + comments).'),
          variant: "destructive",
        });
        return false;
      }
    }

    setIsSubmitting(true);
    try {
      const excerpt = buildExcerpt(content, 150);
      const mainImage = getFirstImageSrc(content) || '';

      let saved: BlogPost | null;
      if (editingDraftId) {
        saved = await updateBlogPost(editingDraftId, title, content, excerpt, mainImage, asDraft);
      } else {
        saved = await createBlogPost(title, content, excerpt, mainImage, user.id, asDraft);
      }

      if (!saved) {
        toast({
          variant: "destructive",
          title: tWithFallback('notifications.error', 'Error'),
          description: tWithFallback('notifications.failedToCreatePost', 'Failed to save. Please try again.'),
        });
        return false;
      }

      // Only run language detection on the first save (new row). Subsequent
      // edits keep the original language detection.
      if (!editingDraftId) {
        await blogTranslationService.detectAndSaveOriginalLanguage(title, content, excerpt, saved.id);
      }

      if (asDraft) {
        toast({
          title: tWithFallback('notifications.draftSaved', 'Draft saved'),
          description: tWithFallback('notifications.draftSavedDescription', 'Your draft has been saved. You can publish it from your drafts.'),
        });
      } else {
        toast({
          title: tWithFallback('notifications.postCreated', 'Published'),
          description: tWithFallback('notifications.postPublished', 'Your blog post has been published.'),
        });
      }
      return true;
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast({
        variant: "destructive",
        title: tWithFallback('notifications.error', 'Error'),
        description: tWithFallback('notifications.unexpectedError', 'An unexpected error occurred. Please try again.'),
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, user, isLimitedRank, editingDraftId, content, title, toast, tWithFallback]);

  const handlePublishFromFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await performSave(false);
    if (ok) navigate('/blog');
  };

  const handleClose = () => {
    if (!hasUnsavedWork) {
      navigate('/blog');
      return;
    }
    setShowExitDialog(true);
  };

  const handleDialogDiscard = () => {
    setShowExitDialog(false);
    setTitle('');
    setContent('');
    setEditingDraftId(null);
    setDraftBaseline(null);
    setTimeout(() => navigate('/blog'), 0);
  };

  const handleDialogSaveDraft = async () => {
    const saved = await performSave(true);
    if (saved) {
      setShowExitDialog(false);
      setTitle('');
      setContent('');
      setEditingDraftId(null);
      setDraftBaseline(null);
      setTimeout(() => navigate('/blog'), 0);
    }
  };

  const formatDraftDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <>
      {/* Back-to-blog button: routes through handleClose so the same exit
          guard fires here as for the footer Close button. */}
      <Button
        type="button"
        variant="ghost"
        onClick={handleClose}
        className={`mb-6 flex items-center ${direction === 'rtl' ? 'justify-end' : 'justify-start'}`}
      >
        {direction === 'rtl' ? (
          <ArrowRight className="mr-2 h-4 w-4" />
        ) : (
          <ArrowLeft className="ml-2 h-4 w-4" />
        )}
        {t('post.backToBlog')}
      </Button>

      {/* Drafts shortcut: only visible when you haven't yet picked one to
          continue. Once you're editing a draft the screen collapses back to
          the plain post-editing layout. */}
      {myDrafts.length > 0 && !editingDraftId && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              <span>
                {tWithFallback('drafts.yourDrafts', 'Your drafts')} ({myDrafts.length})
              </span>
            </div>
            <ul className="divide-y">
              {myDrafts.map((draft) => {
                const isThisOneOpen = editingDraftId === draft.id;
                return (
                  <li
                    key={draft.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {draft.title || tWithFallback('drafts.untitled', 'Untitled draft')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tWithFallback('drafts.lastEdited', 'Last edited')}: {formatDraftDate(draft.updated_at || draft.created_at || '')}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={isThisOneOpen ? 'secondary' : 'outline'}
                        onClick={() => loadDraftIntoForm(draft)}
                        disabled={isSubmitting || (isThisOneOpen && !hasUnsavedWork)}
                      >
                        {isThisOneOpen
                          ? tWithFallback('drafts.editing', 'Editing')
                          : tWithFallback('drafts.continue', 'Continue')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={isSubmitting}
                        aria-label={tWithFallback('drafts.delete', 'Delete draft')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {isLoadingDrafts && (
              <p className="text-xs text-muted-foreground">
                {tWithFallback('status.loading', 'Loading...')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handlePublishFromFooter}>
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
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {tWithFallback('actions.close', 'Close')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !canSubmit || hasReachedLimit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tWithFallback('status.publishing', 'Publishing...')}
                </>
              ) : (
                tWithFallback('forms.publishPost', 'Post')
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span>{tWithFallback('forms.exitTitle', 'Save your draft?')}</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tWithFallback('forms.exitDescription', 'You have unsaved changes. What would you like to do?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowExitDialog(false)}
              disabled={isSubmitting}
            >
              {tWithFallback('actions.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogDiscard}
              disabled={isSubmitting}
            >
              {tWithFallback('actions.discard', 'Discard')}
            </Button>
            <Button
              type="button"
              onClick={handleDialogSaveDraft}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tWithFallback('status.savingDraft', 'Saving draft...')}
                </>
              ) : (
                tWithFallback('forms.saveDraft', 'Save draft')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
