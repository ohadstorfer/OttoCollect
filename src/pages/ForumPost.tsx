
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchForumPost, deleteForumPost } from "@/services/forumService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ForumPost, ForumComment } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ForumCommentComponent } from "@/components/forum/ForumComment";
import { AddCommentForm } from "@/components/forum/AddCommentForm";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, Calendar, Pencil, Trash2 } from "lucide-react";

export default function ForumPostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const fetchedPost = await fetchForumPost(id);
        setPost(fetchedPost);
      } catch (error) {
        console.error("Error loading post:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load the post. It may have been deleted or you don't have permission to view it.",
        });
        navigate("/community/forum");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, navigate, toast]);

  const handleDeletePost = async () => {
    if (!post || !confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      await deleteForumPost(post.id);
      toast({
        description: "Post deleted successfully",
      });
      navigate("/community/forum");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the post. Please try again.",
      });
      setDeleting(false);
    }
  };

  const handleCommentAdded = (newComment: ForumComment) => {
    if (!post) return;
    
    setPost({
      ...post,
      comments: [...(post.comments || []), newComment],
    });
  };

  const handleCommentDeleted = (commentId: string) => {
    if (!post) return;
    
    setPost({
      ...post,
      comments: post.comments?.filter(comment => comment.id !== commentId) || [],
    });
  };

  const handleCommentUpdated = (commentId: string, newContent: string) => {
    if (!post) return;
    
    setPost({
      ...post,
      comments: post.comments?.map(comment => 
        comment.id === commentId 
          ? { ...comment, content: newContent, updatedAt: new Date().toISOString() } 
          : comment
      ) || [],
    });
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-8 text-center">
          <h3 className="text-xl font-medium mb-3">Post not found</h3>
          <p className="text-muted-foreground">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/community/forum">
            <Button className="mt-4">
              Back to Forum
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = format(new Date(post.createdAt), "MMMM d, yyyy 'at' h:mm a");
  const timeSince = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const isOwner = user?.id === post.authorId;
  
  return (
    <div className="container py-8">
      {/* Navigation and actions */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/community/forum")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Forum
        </Button>
        
        {isOwner && (
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate(`/community/forum/edit/${post.id}`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Post
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeletePost}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Post
            </Button>
          </div>
        )}
      </div>

      {/* Post header */}
      <h1 className="text-3xl font-bold mb-6">{post.title}</h1>
      
      <div className="flex items-center gap-3 mb-6">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author?.avatarUrl} />
          <AvatarFallback>{post.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{post.author?.username}</span>
            <Badge variant="outline">{post.author?.rank}</Badge>
          </div>
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span title={formattedDate}>{timeSince}</span>
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="ottoman-card p-6 mb-8">
        <div className="prose max-w-none mb-6">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
        
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {post.imageUrls.map((imageUrl, index) => (
              <div key={index} className="relative aspect-square">
                <img 
                  src={imageUrl} 
                  alt={`Image ${index + 1}`}
                  className="rounded-md object-cover w-full h-full cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">
          Comments ({post.comments?.length || 0})
        </h3>
        <Separator className="mb-4" />
        
        {post.comments && post.comments.length > 0 ? (
          <div className="ottoman-card p-6">
            {post.comments.map(comment => (
              <ForumCommentComponent 
                key={comment.id} 
                comment={comment}
                onDelete={handleCommentDeleted}
                onUpdate={handleCommentUpdated}
              />
            ))}
          </div>
        ) : (
          <div className="ottoman-card p-6 text-center">
            <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        )}
        
        <AddCommentForm 
          postId={post.id}
          onCommentAdded={handleCommentAdded}
        />
        
        {!user && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in to join the conversation
            </p>
            <Link to="/auth">
              <Button>Sign In to Comment</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
