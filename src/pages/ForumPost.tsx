
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddCommentForm } from "@/components/forum/AddCommentForm";
import ForumComment from "@/components/forum/ForumComment";
import { fetchForumPost, deleteForumPost } from "@/services/forumService";
import { ForumPost as ForumPostType, ForumComment as ForumCommentType } from "@/types";
import { ArrowLeft, Calendar, Trash2, Edit, AlertTriangle, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
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
import UserProfileLink from "@/components/common/UserProfileLink";

export default function ForumPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    data: post,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["forumPost", id],
    queryFn: () => fetchForumPost(id!),
    enabled: !!id,
  });

  const canEditOrDelete = user && post?.author && 
    (user.id === post.author.id || ['Admin', 'Super Admin'].includes(user.role));

  const handleDeletePost = async () => {
    if (!post) return;
    
    try {
      await deleteForumPost(post.id);
      toast.success("Post deleted successfully");
      navigate("/community/forum");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  // Handler for adding comments that's compatible with the AddCommentForm component
  const handleCommentAdded = (comment: ForumCommentType) => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl mx-auto flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="page-container max-w-4xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700">
              Error loading post. The post might have been deleted or you don't have permission to view it.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/community/forum')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Forum
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/community/forum')} 
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Forum
          </Button>
          
          {canEditOrDelete && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/community/forum/edit/${post.id}`)}
                className="gap-1"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the post and all of its comments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-6">
                {post.author && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <UserProfileLink 
                      userId={post.author.id}
                      username={post.author.username}
                      avatarUrl={post.author.avatarUrl}
                      rank={post.author.rank}
                      showRank={true}
                    />
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{format(new Date(post.createdAt), 'PPP')}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 pb-8">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {post.content.split('\n').map((paragraph, index) => (
                <p key={index} className={index > 0 ? "mt-4" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>
            
            {post.imageUrls && post.imageUrls.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {post.imageUrls.map((url, index) => (
                  <div key={index} className="border rounded-md overflow-hidden">
                    <img
                      src={url}
                      alt={`Post image ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Comments ({post.comments?.length || 0})</h2>
          
          {user ? (
            <AddCommentForm postId={post.id} onCommentAdded={handleCommentAdded} />
          ) : (
            <Card className="mb-6">
              <CardContent className="py-4">
                <p className="text-center">
                  Please <span className="font-medium cursor-pointer hover:underline" onClick={() => navigate('/auth')}>sign in</span> to add a comment
                </p>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-4 mt-8">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <ForumComment key={comment.id} comment={comment} />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-6">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
