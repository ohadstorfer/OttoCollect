import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Trash2, Edit, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchForumPostById, deleteForumPost, addForumComment } from '@/services/forumService';
import ForumComment from '@/components/forum/ForumComment';
import AddCommentForm from '@/components/forum/AddCommentForm';
import { ForumPost as ForumPostType, ForumComment as ForumCommentType } from '@/types/forum';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import UserProfileLink from '@/components/common/UserProfileLink';
import { toast } from 'sonner';

const ForumPost = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPostType | null>(null);
  const [comments, setComments] = useState<ForumCommentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      setIsLoading(true);
      try {
        const data = await fetchForumPostById(postId);
        if (data) {
          setPost(data);
          setComments(data.comments || []);
        } else {
          toast.error("Post not found");
          navigate('/community/forum');
        }
      } catch (error) {
        console.error("Error loading post:", error);
        toast.error("Error loading post");
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [postId, navigate]);

  const handleDeletePost = async () => {
    if (!post || !window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      await deleteForumPost(post.id);
      toast.success("Post deleted successfully");
      navigate('/community/forum');
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !post) return;

    setIsSubmittingComment(true);
    try {
      const commentId = await addForumComment(post.id, newComment);
      const newCommentObj: ForumCommentType = {
        id: commentId,
        postId: post.id,
        content: newComment,
        authorId: user.id,
        author: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl || '',
          rank: user.rank
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEdited: false
      };
      setComments([newCommentObj, ...comments]);
      setNewComment('');
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentAdded = (comment: ForumCommentType) => {
    setComments(prev => [comment, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Post not found</h2>
          <Button onClick={() => navigate('/community/forum')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forum
          </Button>
        </div>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => navigate('/community/forum')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Forum
      </Button>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
            <div className="flex items-center text-muted-foreground text-sm">
              <UserProfileLink
                userId={post.author?.id || ''}
                username={post.author?.username || 'Unknown'}
                avatarUrl={post.author?.avatarUrl}
                size="sm"
              />
              <span className="mx-2">•</span>
              <span>{timeAgo}</span>
            </div>
          </div>

          {user && post.authorId === user.id && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/community/forum/${post.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeletePost}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 prose max-w-none dark:prose-invert">
          {post.content.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {post.imageUrls.map((imgUrl, idx) => (
              <div key={idx} className="rounded-md overflow-hidden border">
                <img
                  src={imgUrl}
                  alt={`Post image ${idx + 1}`}
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-6 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Comments ({comments.length})
        </h3>

        {user ? (
          <AddCommentForm postId={post.id} onCommentAdded={handleCommentAdded} />
        ) : (
          <div className="bg-muted/50 rounded-md p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Please sign in to leave a comment
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {comments.length > 0 ? (
            comments.map(comment => (
              <ForumComment
                key={comment.id}
                comment={comment}
                onUpdate={(commentId, content) => {
                  setComments(prev => 
                    prev.map(c => c.id === commentId ? { ...c, content, isEdited: true } : c)
                  );
                }}
                onDelete={(commentId) => {
                  setComments(prev => prev.filter(c => c.id !== commentId));
                }}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-6">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPost;
