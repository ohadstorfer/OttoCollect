import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ForumPost as ForumPostType, ForumComment } from "@/types/forum";
import { useAuth } from "@/context/AuthContext";
import { addForumComment, fetchForumPostById, deleteForumPost, updateForumComment, checkUserDailyForumLimit, fetchCommentsByPostId } from "@/services/forumService";
import { supabase } from '@/integrations/supabase/client';
import UserProfileLink from "@/components/common/UserProfileLink";
import ForumCommentComponent from "@/components/forum/ForumComment";
import ImageGallery from "@/components/forum/ImageGallery";
import { getInitials } from '@/lib/utils';
import { UserRank } from '@/types';
import { ArrowLeft, Trash2, Edit2, Ban, MessageSquare, Reply, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime, useDateLocale } from '@/lib/dateUtils';
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
import { useLanguage } from '@/context/LanguageContext';
import { TranslationButton } from '@/components/forum/TranslationButton';
import { CommentTranslationButton } from '@/components/forum/CommentTranslationButton';
import { forumTranslationService } from '@/services/forumTranslationService';


// Simple function to detect and render links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Recursive comment rendering function
const renderComment = (
  comment: ForumComment,
  depth: number = 0,
  maxDepth: number = 3,
  props: {
    user: any;
    isUserBlocked: boolean;
    hasReachedDailyLimit: boolean;
    isLimitedRank: boolean;
    replyingToCommentId: string | null;
    replyContent: string;
    isSubmittingReply: boolean;
    editingCommentId: string | null;
    editedContent: string;
    isSubmitting: boolean;
    startReplying: (comment: ForumComment) => void;
    cancelReplying: () => void;
    handleReplyToComment: (commentId: string) => void;
    startEditing: (comment: ForumComment) => void;
    cancelEditing: () => void;
    handleEditComment: (commentId: string, content: string) => void;
    onDeleteComment: (commentId: string) => void;
    handleOnProfileClick: (userId: string | undefined) => void;
    renderTextWithLinks: (text: string) => React.ReactNode;
    updateReplyContent: (content: string) => void;
    updateEditedContent: (content: string) => void;
    t: (key: string) => string;
    currentLanguage: string;
  }
) => {
  const isReply = depth > 0;
  const canReply = props.user && depth < maxDepth;

  return (
    <div key={comment.id} className={`${isReply ? (props.currentLanguage === 'ar' ? 'mr-10' : 'ml-10') : ''}`}>
      {/* Wrap parent comment and replies with soft outline */}
      <div className={`${depth === 0 && comment.replies  ? 'border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/20' : ''}`}>
        <div className="flex gap-3">
          <Avatar
            className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition"
            onClick={() => props.handleOnProfileClick(comment.author?.id)}
          >
            <AvatarImage src={comment.author?.avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(comment.author?.username || props.t('post.anonymous'))}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Comment Header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`font-medium text-sm cursor-pointer hover:text-primary transition-colors break-words ${props.currentLanguage === 'ar' ? 'text-right' : ''}`}
                onClick={() => props.handleOnProfileClick(comment.author?.id)}
              >
                {comment.author?.username || props.t('post.anonymous')}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
              <span className={`text-xs text-muted-foreground flex-shrink-0 ${props.currentLanguage === 'ar' ? 'text-right' : ''}`}>{formatRelativeTime(comment.created_at || comment.createdAt, props.currentLanguage)}</span>
              {comment.isEdited && (
                <>
                  <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
                  <span className={`text-xs italic text-muted-foreground flex-shrink-0 ${props.currentLanguage === 'ar' ? 'text-right' : ''}`}>{props.t('post.edited')}</span>
                </>
              )}
            </div>

            {/* Comment Content */}
            {props.editingCommentId === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={props.editedContent}
                  onChange={(e) => props.updateEditedContent(e.target.value)}
                  className="min-h-[80px] text-sm border rounded-md resize-none"
                  placeholder={props.t('post.editPlaceholder')}
                  disabled={props.isSubmitting}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={props.cancelEditing}
                    disabled={props.isSubmitting}
                  >
                    {props.t('post.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => props.handleEditComment(comment.id, props.editedContent)}
                    disabled={props.isSubmitting || props.editedContent.trim() === ''}
                  >
                    {props.t('post.saveButton')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={`text-sm leading-relaxed text-foreground mb-3 break-words whitespace-pre-wrap overflow-hidden ${props.currentLanguage === 'ar' ? 'text-right' : ''}`}>
                  {props.renderTextWithLinks(comment.content)}
                </div>

                {/* Reply Form */}
                {props.replyingToCommentId === comment.id && (
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      <span className="break-words">{props.t('post.replyingTo')} {comment.author?.username || props.t('post.thisComment')}</span>
                    </div>
                    <Textarea 
                      value={props.replyContent}
                      onChange={(e) => props.updateReplyContent(e.target.value)}
                      className="min-h-[60px] resize-none text-sm border rounded-md"
                      placeholder={`${props.t('post.replyTo')} ${comment.author?.username || props.t('post.thisComment')}...`}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => props.handleReplyToComment(comment.id)}
                        disabled={props.isSubmittingReply || !props.replyContent.trim()}
                      >
                        {props.isSubmittingReply ? props.t('post.posting') : props.t('post.postReply')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={props.cancelReplying}
                        disabled={props.isSubmittingReply}
                      >
                        {props.t('post.cancel')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comment Actions */}
                {props.replyingToCommentId !== comment.id && (
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    {canReply && !props.isUserBlocked && !props.hasReachedDailyLimit && !isReply && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => props.startReplying(comment)}
                        className="text-muted-foreground hover:text-foreground h-6 px-2"
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    )}
                    {((props.user?.id === comment.authorId) || props.user?.role?.includes('Admin')) && (
                      <>
                        {props.user?.id === comment.authorId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => props.startEditing(comment)}
                            className="text-muted-foreground hover:text-foreground h-6 px-2"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-100/50 h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className={props.currentLanguage === 'ar' ? 'text-right' : ''}>
                            <AlertDialogHeader>
                              <AlertDialogTitle className={props.currentLanguage === 'ar' ? 'text-right' : ''}>{props.t('actions.deleteComment')}</AlertDialogTitle>
                              <AlertDialogDescription className={props.currentLanguage === 'ar' ? 'text-right' : ''}>
                                {props.t('actions.deleteCommentConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className={props.currentLanguage === 'ar' ? 'text-right' : ''}>{props.t('post.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => props.onDeleteComment(comment.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {props.t('actions.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => 
              renderComment(reply, depth + 1, maxDepth, props)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ForumPostPage = () => {
  const { id: postId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation(['forum']);
  const { formatRelativeTime, currentLanguage } = useDateLocale();
  const [post, setPost] = useState<ForumPostType | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showProfileActionDialog, setShowProfileActionDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const { direction } = useLanguage();
  
  // Translation state
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');
  const [showTranslated, setShowTranslated] = useState(false);

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
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);

  useEffect(() => {
    const checkUserBlockStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_forum_blocked')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setIsUserBlocked(data?.is_forum_blocked || false);
      } catch (error) {
        console.error('Error checking user block status:', error);
      }
    };

    checkUserBlockStatus();
  }, [user]);

  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user || !isLimitedRank) return;
      
      try {
        const { hasReachedLimit, dailyCount: count } = await checkUserDailyForumLimit(user.id);
        setHasReachedDailyLimit(hasReachedLimit);
        setDailyCount(count);
      } catch (error) {
        console.error('Error checking daily limit:', error);
      }
    };

    checkDailyLimit();
  }, [user, isLimitedRank]);

  const loadPost = async (postId: string) => {
    setIsLoading(true);
    try {
      const fetchedPost = await fetchForumPostById(postId);
      if (fetchedPost) {
        setPost(fetchedPost);
        // Load comments with nested structure
        const nestedComments = await fetchCommentsByPostId(postId);
        setComments(nestedComments);
      } else {
        toast.error("Failed to load post.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh comments with nested structure
  const refreshComments = async () => {
    if (!post) return;
    try {
      const nestedComments = await fetchCommentsByPostId(post.id);
      setComments(nestedComments);
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!user || !post || commentContent.trim() === '') return;

    // Check limit before submitting comment
    if (isLimitedRank) {
      const { hasReachedLimit } = await checkUserDailyForumLimit(user.id);
      if (hasReachedLimit) {
        toast.error(tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 6 forum activities (posts + comments).'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newComment = await addForumComment(post.id, commentContent);

      if (newComment) {
        // Add the new comment to the list immediately
        setComments(prevComments => [newComment, ...prevComments]);
        setCommentContent('');
        setPost({
          ...post,
          commentCount: (post.commentCount || 0) + 1,
        });
        toast.success("Your comment has been added successfully.");

        // Update daily count after successful comment
        if (isLimitedRank) {
          setDailyCount(prev => prev + 1);
          if (dailyCount + 1 >= 6) {
            setHasReachedDailyLimit(true);
          }
        }
      } else {
        toast.error("Failed to add comment. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteComment = (commentId: string) => {
    // Remove the comment from the nested structure properly
    const removeCommentFromTree = (comments: ForumComment[]): ForumComment[] => {
      return comments
        .filter(comment => comment.id !== commentId)
        .map(comment => {
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: removeCommentFromTree(comment.replies)
            };
          }
          return comment;
        });
    };

    setComments(prevComments => removeCommentFromTree(prevComments));
    
    if (post) {
      setPost({ ...post, commentCount: (post.commentCount || 1) - 1 });
    }
  };

  const canDeletePost = useMemo(() => {
    if (!user || !post) return false;
    const isAdmin = user.role?.includes('Admin');
    const isAuthor = post.authorId === user.id;
    return isAdmin || isAuthor;
  }, [user, post]);

  const handleDeletePost = async () => {
    if (!post || !user) return;

    setIsDeleting(true);
    try {
      const success = await deleteForumPost(post.id);

      if (success) {
        toast.success("Post deleted successfully");
        navigate('/community/forum');
      } else {
        toast.error(t('notifications.failedToDeletePost'));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
              toast.error(t('notifications.failedToDeletePost'));
    } finally {
      setIsDeleting(false);
    }
  };

  const updateEditedContent = (content: string) => {
    setEditedContent(content);
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const updatedComment = await updateForumComment(commentId, newContent);

      if (updatedComment) {
        // Update the nested comment structure properly
        const updateCommentInTree = (comments: ForumComment[]): ForumComment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, content: newContent, isEdited: true };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentInTree(comment.replies)
              };
            }
            return comment;
          });
        };

        setComments(prevComments => updateCommentInTree(prevComments));
        setEditingCommentId(null);
        setEditedContent('');
        toast.success("Comment updated successfully");
      } else {
        toast.error("Failed to update comment");
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (comment: ForumComment) => {
    setEditingCommentId(comment.id);
    setEditedContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditedContent('');
  };

  const startReplying = (comment: ForumComment) => {
    setReplyingToCommentId(comment.id);
    setReplyContent('');
  };

  const cancelReplying = () => {
    setReplyingToCommentId(null);
    setReplyContent('');
  };

  const updateReplyContent = (content: string) => {
    setReplyContent(content);
  };

  const handleReplyToComment = async (commentId: string) => {
    if (!user || !post || replyContent.trim() === '') return;

    // Check limit before submitting reply
    if (isLimitedRank) {
      const { hasReachedLimit } = await checkUserDailyForumLimit(user.id);
      if (hasReachedLimit) {
        toast.error(tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 6 forum activities (posts + comments).'));
        return;
      }
    }

    setIsSubmittingReply(true);
    try {
      const newReply = await addForumComment(post.id, replyContent.trim(), commentId);

      if (newReply) {
        // Add the new reply to the nested structure immediately
        const addReplyToTree = (comments: ForumComment[]): ForumComment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply]
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: addReplyToTree(comment.replies)
              };
            }
            return comment;
          });
        };

        setComments(prevComments => addReplyToTree(prevComments));
        setReplyContent('');
        setReplyingToCommentId(null);
        toast.success(t('post.replySuccess'));

        // Update daily count after successful reply
        if (isLimitedRank) {
          setDailyCount(prev => prev + 1);
          if (dailyCount + 1 >= 6) {
            setHasReachedDailyLimit(true);
          }
        }
      } else {
        toast.error(t('post.replyFailed'));
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error(t('post.replyError'));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Function to block user from forum
  const handleBlockUserFromForum = async (userId: string) => {
    if (!user?.role?.includes('Super Admin')) return;
    
    setIsBlockingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_forum_blocked: true })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User has been blocked from the forum');
      setShowProfileActionDialog(false);
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user from forum');
    } finally {
      setIsBlockingUser(false);
    }
  };

  // Profile click handler
  const handleOnProfileClick = (userId: string | undefined) => {
    if (!userId) return;

    if (user?.role === 'Super Admin') {
      setSelectedUserId(userId);
      setShowProfileActionDialog(true);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-ottoman-200/20 rounded w-64 mb-6"></div>
            <div className="h-40 bg-ottoman-200/20 rounded w-full max-w-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-container">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-2"><span>Post not found</span></h2>
          <p className="text-muted-foreground">The post you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const getRankAsUserRank = (rank: string): UserRank => {
    const validRanks: UserRank[] = [
      'Newbie Collector',
      'Beginner Collector',
      'Mid Collector',
      'Known Collector',
      'Advance Collector',
      'Master Collector',
      'Admin Newbie Collector',
      'Admin Beginner Collector',
      'Admin Mid Collector',
      'Admin Known Collector',
      'Admin Advance Collector',
      'Admin Master Collector',
      'Super Admin Newbie Collector',
      'Super Admin Beginner Collector',
      'Super Admin Mid Collector',
      'Super Admin Known Collector',
      'Super Admin Advance Collector',
      'Super Admin Master Collector'
    ];

    return validRanks.includes(rank as UserRank)
      ? (rank as UserRank)
      : 'Newbie Collector';
  };

  const authorRank = getRankAsUserRank(post.author?.rank || 'Newbie Collector');

  const formattedDate = formatRelativeTime(post.createdAt);

  const onAddComment = (comment: ForumComment) => {
    if (!post) return;
    // Add the new comment to the list immediately
    setComments(prevComments => [comment, ...prevComments]);
    setPost({
      ...post,
      commentCount: (post.commentCount || 0) + 1,
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button and delete option */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            {direction === 'rtl' ? (
                <ArrowRight className="w-4 h-4 mr-2" />
              ) : (
                <ArrowLeft className="w-4 h-4 mr-2" />
              )}
            {t('navigation.backToForum')}
          </Button>

          {canDeletePost && (
                      <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={direction === 'rtl' ? 'text-right' : ''}>
              <AlertDialogHeader>
                <AlertDialogTitle className={direction === 'rtl' ? 'text-right' : ''}> <span>{t('actions.deletePost')}</span></AlertDialogTitle>
                <AlertDialogDescription className={direction === 'rtl' ? 'text-right' : ''}>
                  {t('actions.deletePostConfirm')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={direction === 'rtl' ? 'text-right' : ''}>{t('post.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePost}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {t('actions.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>

        {/* Main Post */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            {/* Author Avatar */}
            <Avatar
              className="h-10 w-10 flex-shrink-0 cursor-pointer hover:opacity-80 transition"
              onClick={() => handleOnProfileClick(post?.author?.id)}
            >
              <AvatarImage src={post.author?.avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {post.author?.username ? getInitials(post.author.username) : '??'}
              </AvatarFallback>
            </Avatar>

            {/* Post Content */}
            <div className="flex-1 min-w-0">
              {/* Post Header */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`font-medium text-sm cursor-pointer hover:text-primary transition-colors break-words ${direction === 'rtl' ? 'text-right' : ''}`}
                  onClick={() => handleOnProfileClick(post?.author?.id)}
                >
                  {post.author?.username || t('post.anonymous')}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
                <span className={`text-xs text-muted-foreground flex-shrink-0 ${direction === 'rtl' ? 'text-right' : ''}`}>{formattedDate}</span>
              </div>

              {/* Post Title */}
              <h1 className={`text-xl font-semibold mb-3 text-foreground break-words ${direction === 'rtl' ? 'text-right' : ''}`}>
                <span>{renderTextWithLinks(showTranslated && translatedTitle ? translatedTitle : post.title)}</span>
              </h1>

              {/* Post Content */}
              <div className={`text-sm leading-relaxed mb-4 text-foreground break-words whitespace-pre-wrap overflow-hidden ${direction === 'rtl' ? 'text-right' : ''}`}>
                {renderTextWithLinks(showTranslated && translatedContent ? translatedContent : post.content)}
              </div>

              {/* Translation Button */}
              <div className={`mb-3 ${direction === 'rtl' ? 'text-right' : ''}`}>
                <TranslationButton
                  postId={post.id}
                  postType="forum_posts"
                  currentTitle={post.title}
                  currentContent={post.content}
                  onTranslated={(title, content) => {
                    setTranslatedTitle(title);
                    setTranslatedContent(content);
                    setShowTranslated(true);
                  }}
                />
              </div>

              {/* Post Images - Compact Gallery */}
              {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="mb-3">
                  <ImageGallery images={post.imageUrls} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" />
            <h2 className="text-lg font-semibold">
              <span>{t('post.comments')} ({post.commentCount || 0})</span>
            </h2>
          </div>

          {/* Comment Form */}
          {user ? (
            isUserBlocked ? (
              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800 text-center mb-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {t('post.blockedFromCommenting')}
                </p>
              </div>
            ) : (
              <>
                {/* Daily activity warning for limited ranks */}
                {isLimitedRank && hasReachedDailyLimit && (
                  <div className="mb-4">
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 text-sm">
                        {tWithFallback('limits.dailyLimitWarning', 'You have reached your daily limit of 6 forum activities (posts + comments).')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-card border rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder={tWithFallback('forms.commentPlaceholder', 'Write your comment...')}
                        className="resize-none min-h-[80px] text-sm"
                        disabled={hasReachedDailyLimit}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={isSubmitting || commentContent.trim() === '' || hasReachedDailyLimit}
                          size="sm"
                        >
                          {isSubmitting ? tWithFallback('status.posting', 'Posting...') : tWithFallback('actions.postComment', 'Post Comment')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            <div className="bg-muted/50 p-4 rounded-md border text-center mb-4">
              <p className="text-muted-foreground text-sm">
                {tWithFallback('post.loginToComment', 'Please log in to add a comment.')}
              </p>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {comments.length > 0 ? (
              comments.map((comment) => 
                renderComment(comment, 0, 3, {
                  user,
                  isUserBlocked,
                  hasReachedDailyLimit,
                  isLimitedRank,
                  replyingToCommentId,
                  replyContent,
                  isSubmittingReply,
                  editingCommentId,
                  editedContent,
                  isSubmitting,
                  startReplying,
                  cancelReplying,
                  handleReplyToComment,
                  startEditing,
                  cancelEditing,
                  handleEditComment,
                  onDeleteComment,
                  handleOnProfileClick,
                  renderTextWithLinks,
                  updateReplyContent,
                  updateEditedContent,
                  t,
                  currentLanguage: currentLanguage
                })
              )
            ) : (
              <div className="bg-muted/50 p-8 rounded-md border text-center">
                <p className="text-muted-foreground text-sm">{tWithFallback('post.noComments', 'No comments yet. Be the first to comment!')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Action Dialog for Super Admin */}
      <AlertDialog open={showProfileActionDialog} onOpenChange={setShowProfileActionDialog}>
        <AlertDialogContent className={direction === 'rtl' ? 'text-right' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={direction === 'rtl' ? 'text-right' : ''}><span>{tWithFallback('profile.actions', 'User Profile Actions')}</span></AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigate(`/profile/${selectedUserId}`);
                setShowProfileActionDialog(false);
              }}
            >
              {tWithFallback('profile.goToProfile', 'Go to Profile')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUserId && handleBlockUserFromForum(selectedUserId)}
              disabled={isBlockingUser}
            >
              <Ban className="h-4 w-4 mr-2" />
              {isBlockingUser ? tWithFallback('profile.blocking', 'Blocking...') : tWithFallback('profile.blockFromForum', 'Block from Forum')}
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className={direction === 'rtl' ? 'text-right' : ''}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ForumPostPage;
