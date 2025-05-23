
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ForumPost as ForumPostType, ForumComment } from "@/types/forum";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { addForumComment, fetchForumPostById } from "@/services/forumService";
import UserProfileLink from "@/components/common/UserProfileLink";
import ForumCommentComponent from "@/components/forum/ForumComment";
import ImageGallery from "@/components/forum/ImageGallery";
import { getInitials } from '@/lib/utils';
import { UserRank } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';

const ForumPostPage = () => {
  const { id: postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPostType | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button> 


        <div className="glass-card p-6 rounded-md shadow-md mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={post.author?.avatarUrl} />
              <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                {post.author?.username ? getInitials(post.author.username) : '??'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{post.author?.username || 'Unknown User'}</span>
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
                  <div key={comment.id} className="group mb-3 last:mb-0">
                    <ForumCommentComponent
                      comment={comment}
                      currentUserId={user?.id || ''}
                      onUpdate={onUpdateComment}
                      onDelete={onDeleteComment}
                    />
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
