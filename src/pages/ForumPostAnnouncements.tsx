import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ForumPost as ForumPostType, ForumComment } from "@/types/forum";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { addForumComment, fetchForumPostById, deleteForumPost, updateForumComment, checkUserDailyForumLimit } from "@/services/forumService";
import { supabase } from '@/integrations/supabase/client';
import UserProfileLink from "@/components/common/UserProfileLink";
import ForumCommentComponent from "@/components/forum/ForumComment";
import ImageGallery from "@/components/forum/ImageGallery";
import { getInitials } from '@/lib/utils';
import { UserRank } from '@/types';
import { ArrowLeft, Trash2, Edit2, Ban, MessageSquare, Megaphone } from 'lucide-react';
import { useTheme } from 'next-themes';
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


// Simple function to detect and render links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
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

const ForumPostAnnouncementsPage = () => {
  const { id: postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPostType | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showProfileActionDialog, setShowProfileActionDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

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
      // For announcements, we would need a separate service function
      // For now, using the forum post service
      const { data, error } = await supabase
        .from('forum_announcements')
        .select(`
          *,
          author:profiles!forum_announcements_author_id_fkey(id, username, avatar_url, rank)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      if (data) {
        setPost({
          id: data.id,
          title: data.title,
          content: data.content,
          authorId: data.author_id,
          author: {
            ...data.author,
            avatarUrl: data.author.avatar_url, // Fix: map avatar_url to avatarUrl
          },
          imageUrls: data.image_urls || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          commentCount: 0,
          comments: []
        });
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading announcement:', error);
      toast.error("Failed to load announcement.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !post || commentContent.trim() === '') return;

    // Check limit before submitting comment
    if (isLimitedRank) {
      const { hasReachedLimit } = await checkUserDailyForumLimit(user.id);
      if (hasReachedLimit) {
        toast.error("You have reached your daily limit of 6 forum activities (posts + comments).");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newComment = await addForumComment(post.id, commentContent);

      if (newComment) {
        onAddComment(newComment);
        setCommentContent('');
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

  const onUpdateComment = (commentId: string, content: string) => {
    setComments((prevComments) =>
      prevComments.map((comment) =>
        comment.id === commentId ? { ...comment, content, isEdited: true } : comment
      )
    );
  };

  const onDeleteComment = (commentId: string) => {
    setComments((prevComments) =>
      prevComments.filter((comment) => comment.id !== commentId)
    );
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
      const { error } = await supabase
        .from('forum_announcements')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast.success("Announcement deleted successfully");
      navigate('/community/forum');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error("Failed to delete announcement");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const updatedComment = await updateForumComment(commentId, newContent);

      if (updatedComment) {
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId
              ? { ...comment, content: newContent, isEdited: true }
              : comment
          )
        );
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
          <h2 className="text-2xl font-semibold mb-2"><span>Announcement not found</span></h2>
          <p className="text-muted-foreground">The announcement you're looking for doesn't exist or has been removed.</p>
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

  const formattedDate = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  const onAddComment = (comment: ForumComment) => {
    if (!post) return;
    setComments((prev) => [comment, ...prev]);
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forum
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
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this announcement? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeletePost}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Main Announcement */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600 uppercase tracking-wide"> Announcement</span>
          </div>
          
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
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleOnProfileClick(post?.author?.id)}
                >
                  {post.author?.username || 'Anonymous'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
              </div>

              {/* Post Title */}
              <h1 className="text-xl font-semibold mb-3 text-foreground">
                <span>{renderTextWithLinks(post.title)}</span>
              </h1>

              {/* Post Content */}
              <div className="text-sm leading-relaxed mb-4 text-foreground">
                {renderTextWithLinks(post.content)}
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
              <span>Comments ({post.commentCount || 0})</span>
            </h2>
          </div>

          {/* Comment Form */}
          {user ? (
            isUserBlocked ? (
              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800 text-center mb-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  You have been blocked from commenting on forum posts
                </p>
              </div>
            ) : (
              <>
                {/* Daily activity warning for limited ranks */}
                {isLimitedRank && hasReachedDailyLimit && (
                  <div className="mb-4">
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 text-sm">
                        You have reached your daily limit of 6 forum activities (posts + comments).
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
                        placeholder="Add your comment..."
                        className="resize-none min-h-[80px] text-sm"
                        disabled={hasReachedDailyLimit}
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleAddComment} 
                          disabled={isSubmitting || commentContent.trim() === '' || hasReachedDailyLimit}
                          size="sm"
                        >
                          {isSubmitting ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            <div className="bg-muted/30 p-4 rounded-lg text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Please <button onClick={() => navigate('/auth')} className="text-primary hover:underline">sign in</button> to add a comment.
              </p>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <ForumCommentComponent
                  key={comment.id}
                  comment={comment}
                  onCommentUpdate={() => window.location.reload()}
                />
              ))
            )}
          </div>
        </div>

        {/* Profile Action Dialog for Super Admins */}
        {user?.role === 'Super Admin' && (
          <AlertDialog open={showProfileActionDialog} onOpenChange={setShowProfileActionDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>User Management</AlertDialogTitle>
                <AlertDialogDescription>
                  Choose an action for this user:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedUserId) {
                      navigate(`/profile/${selectedUserId}`);
                      setShowProfileActionDialog(false);
                    }
                  }}
                >
                  View Profile
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedUserId && handleBlockUserFromForum(selectedUserId)}
                  disabled={isBlockingUser}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {isBlockingUser ? 'Blocking...' : 'Block from Forum'}
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default ForumPostAnnouncementsPage;