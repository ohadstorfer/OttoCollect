
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { ForumPost, ForumComment } from '@/types/forum';
import { fetchForumPostById, addCommentToPost } from '@/services/forumService';
import Comment from '@/components/forum/ForumComment';
import AddCommentForm from '@/components/forum/AddCommentForm';
import ImageGallery from '@/components/forum/ImageGallery';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

const ForumPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const postData = await fetchForumPostById(id);
        if (postData) {
          setPost(postData as unknown as ForumPost);
          setComments(postData.comments || []);
        } else {
          // Post not found, redirect to forum
          navigate('/community/forum');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPost();
  }, [id, navigate]);
  
  const handleCommentAdded = (newComment: ForumComment) => {
    setComments(prevComments => [...prevComments, newComment]);
  };
  
  const handleCommentUpdated = (commentId: string, content: string) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, content, isEdited: true, updatedAt: new Date().toISOString() } 
          : comment
      )
    );
  };
  
  const handleCommentDeleted = (commentId: string) => {
    setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
  };
  
  if (loading) {
    return (
      <div className="page-container flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="page-container py-10">
        <p>Post not found</p>
      </div>
    );
  }
  
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  return (
    <div className="page-container py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/community/forum')} 
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Forum
      </Button>
      
      <article className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
          <div className="flex items-center text-sm text-muted-foreground">
            <span>{post.author?.username || 'Unknown User'}</span>
            <span className="mx-2">•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        
        {post.imageUrls && post.imageUrls.length > 0 && (
          <ImageGallery images={post.imageUrls} />
        )}
        
        <div className="mt-4 whitespace-pre-line prose prose-ottoman max-w-none dark:prose-invert">
          {post.content}
        </div>
        
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Comments ({comments.length})</h2>
          
          {user && (
            <div className="mb-6">
              <AddCommentForm 
                postId={post.id} 
                user={user} 
                onCommentAdded={handleCommentAdded} 
              />
            </div>
          )}
          
          {comments.length > 0 ? (
            <div className="space-y-0 border rounded-lg overflow-hidden">
              {comments.map((comment) => (
                <Comment 
                  key={comment.id} 
                  comment={comment}
                  currentUserId={user?.id || ''}
                  onUpdate={handleCommentUpdated}
                  onDelete={handleCommentDeleted}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

export default ForumPostPage;
