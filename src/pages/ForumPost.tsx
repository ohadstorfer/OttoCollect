import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ForumPost as ForumPostType, ForumComment } from "@/types/forum";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { addForumComment, fetchForumPostById, deleteForumPost, updateForumComment } from "@/services/forumService";
import UserProfileLink from "@/components/common/UserProfileLink";
import ForumCommentComponent from "@/components/forum/ForumComment";
import ImageGallery from "@/components/forum/ImageGallery";
import { getInitials } from '@/lib/utils';
import { UserRank } from '@/types';
import { ArrowLeft, Trash2, Edit2 } from 'lucide-react';
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

const ForumPostPage = () => {
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
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);

  const loadPost = async (postId: string) => {
    setIsLoading(true);
    try {
      const fetchedPost = await fetchForumPostById(postId);
      if (fetchedPost) {
        setPost(fetchedPost);
        setComments(fetchedPost.comments || []);
      } else {
        toast.error("Failed to load post.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !post || commentContent.trim() === '') return;

    setIsSubmitting(true);
    try {
      const newComment = await addForumComment(post.id, commentContent);

      if (newComment) {
        onAddComment(newComment);
        setCommentContent('');
        toast.success("Your comment has been added successfully.");
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
      const success = await deleteForumPost(post.id);

      if (success) {
        toast.success("Post deleted successfully");
        navigate('/community/forum');
      } else {
        toast.error("Failed to delete post");
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error("Failed to delete post");
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
          <h2 className="text-2xl font-semibold mb-2">Post not found</h2>
          <p className="text-muted-foreground">The post you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const getRankAsUserRank = (rank: string): UserRank => {
    const validRanks: UserRank[] = [
      'Newbie',
      'Beginner Collector',
      'Casual Collector',
      'Known Collector',
      'Advance Collector',
      'Admin',
      'Super Admin'
    ];

    return validRanks.includes(rank as UserRank)
      ? (rank as UserRank)
      : 'Newbie';
  };

  const authorRank = getRankAsUserRank(post.author?.rank || 'Newbie');

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
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
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
                  {/* Delete Post */}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this post? This action cannot be undone.
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

        <div className="glass-card p-6 rounded-md shadow-md mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <Avatar
              className="h-12 w-12 border cursor-pointer hover:opacity-80 active:scale-95 transition"
              onClick={() => post?.author?.id && navigate(`/profile/${post.author.id}`)}
            >
              <AvatarImage src={post.author?.avatarUrl} />
              <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                {post.author?.username ? getInitials(post.author.username) : '??'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => post.author && navigate(`/profile/${post.author.id}`)}
                  tabIndex={0}
                  role="button"
                  aria-label="Go to author profile"

                >
                  <span onClick={() => post?.author?.id && navigate(`/profile/${post.author.id}`)} className="font-semibold text-base text-ottoman-900 dark:text-parchment-200">
                    {post.author?.username || 'Anonymous'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{formattedDate}</span>
              </div>
              <h6 className="font-semibold text-2xl animate-fade-in">{post.title}</h6>
              <div className="whitespace-pre-line mb-4">{post.content}</div>

              {post.imageUrls && post.imageUrls.length > 0 && (
                <ImageGallery images={post.imageUrls} />
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-semibold mb-4">Comments • {post.commentCount || 0}</h2>

          {user ? (
            <div className="flex gap-3 mb-6 glass-card p-4 rounded-md border ">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Add your comment..."
                  className="resize-none min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={isSubmitting || commentContent.trim() === ''}
                  >
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-parchment-10/30 p-4 rounded-md border border-ottoman-100 text-center mb-6">
              <p className="text-muted-foreground">
                Please log in to add a comment.
              </p>
            </div>
          )}

          <div className="space-y-4 px-4 glass-card p-4 rounded-md border">
            {comments.length > 0 ? (
              <div className="bg-parchment-10/20 rounded-md border p-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="group mb-3 last:mb-0 flex items-start gap-3">
                    <div
                      className="cursor-pointer"
                      onClick={() => comment.author && navigate(`/profile/${comment.author.id}`)}
                      tabIndex={0}
                      role="button"
                      aria-label="Go to comment author profile"
                      onKeyDown={e => { if (e.key === 'Enter' && comment.author) navigate(`/profile/${comment.author.id}`); }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author?.avatarUrl} />
                        <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                          {getInitials(comment.author?.username || 'Anonymous')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold text-sm text-ottoman-900 dark:text-parchment-200 cursor-pointer"
                          onClick={() => comment.author && navigate(`/profile/${comment.author.id}`)}
                          tabIndex={0}
                          role="button"
                          aria-label="Go to comment author profile"
                          onKeyDown={e => { if (e.key === 'Enter' && comment.author) navigate(`/profile/${comment.author.id}`); }}
                        >
                          {comment.author?.username || 'Anonymous'}
                        </span>
                        <span className="text-sm text-muted-foreground">{formattedDate}</span>
                        {comment.isEdited && <span className="text-xs italic text-muted-foreground">(edited)</span>}
                      </div>

                      {editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isSubmitting}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditComment(comment.id, editedContent)}
                              disabled={isSubmitting || editedContent.trim() === ''}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-line mb-2">{comment.content}</div>

                          {/* Comment Actions */}
                          {((user?.id === comment.authorId) || user?.role?.includes('Admin')) && (
                            <div className="flex gap-2 justify-end">
                              {user?.id === comment.authorId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(comment)}
                                  className="text-ottoman-600 hover:text-ottoman-700 hover:bg-ottoman-100/50"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  {/* Edit */}
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {/* Delete */}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this comment? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => onDeleteComment(comment.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
              : (
                <div className="bg-parchment-10/20 p-8 rounded-md border border-ottoman-100/50 text-center">
                  <p className="text-muted-foreground">No comments yet. Be the first to contribute!</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumPostPage;
