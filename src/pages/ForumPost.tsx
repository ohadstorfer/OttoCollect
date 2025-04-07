import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import { ForumComment } from '@/components/forum/ForumComment';
import { AddCommentForm } from '@/components/forum/AddCommentForm';
import { fetchForumPostById, addForumComment } from '@/services/forumService';
import { useAuth } from '@/context/AuthContext';
import { ForumPost as ForumPostType, ForumComment as ForumCommentType } from '@/types/forum';

const ForumPost = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPostType | null>(null);
  const [comments, setComments] = useState<ForumCommentType[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast({
          title: "Error",
          description: "Failed to load post.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !post || commentContent.trim() === '') return;

    setIsSubmitting(true);
    try {
      const newComment = await addForumComment(
        post.id,
        user.id,
        commentContent
      );

      if (newComment) {
        onAddComment(newComment);
        setCommentContent('');
        toast({
          title: "Comment added",
          description: "Your comment has been added successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add comment. Please try again.",
          variant: "destructive",
        });
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

  if (isLoading) {
    return <div className="text-center py-10">Loading post...</div>;
  }

  if (!post) {
    return <div className="text-center py-10">Post not found.</div>;
  }

  const authorRank = post?.author?.rank || 'User';

  const formattedDate = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  const onAddComment = (comment: any) => {
    if (!post) return;
    setComments((prev) => [comment, ...prev]);
    setPost({
      ...post,
      commentCount: (post.commentCount || 0) + 1,
    });
  };

  return (
    <div className="page-container">
      <h1 className="page-title">{post.title}</h1>

      <div className="max-w-4xl mx-auto">
        <div className="bg-parchment-50 p-6 rounded-md shadow-md mb-6">
          <div className="flex items-start gap-4">
            <UserProfileLink
              userId={post.authorId}
              username={post.author?.username || "Unknown User"}
              avatarUrl={post.author?.avatarUrl}
              rank={authorRank}
            >
              <Avatar className="h-12 w-12 border">
                <AvatarImage src={post.author?.avatarUrl} />
                <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                  {post.author?.username ? getInitials(post.author.username) : '??'}
                </AvatarFallback>
              </Avatar>
            </UserProfileLink>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserProfileLink
                  userId={post.authorId}
                  username={post.author?.username || "Unknown User"}
                  avatarUrl={post.author?.avatarUrl}
                  rank={authorRank}
                >
                  <span className="font-semibold">{post.author?.username || 'Unknown User'}</span>
                </UserProfileLink>
                <span className="text-sm text-muted-foreground">{formattedDate}</span>
              </div>
              <div className="whitespace-pre-line">{post.content}</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Comments</h2>
          {user ? (
            <div className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <Textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Add your comment..."
                className="flex-grow"
              />
              <Button onClick={handleAddComment} disabled={isSubmitting}>
                Post
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Please log in to add a comment.
            </p>
          )}
        </div>

        <div>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onUpdate={onUpdateComment}
                onDelete={onDeleteComment}
              />
            ))
          ) : (
            <p className="text-muted-foreground">No comments yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPost;
