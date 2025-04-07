
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createForumPost } from "@/services/forumService";
import ImageUploader from "./ImageUploader";

export const CreatePostForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid form",
        description: "Please provide both title and content for your post.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Creating forum post with:", { title, content, images });
      const postId = await createForumPost(title, content, images.length > 0 ? images : []);
      console.log("Post created with ID:", postId);
      
      toast({
        description: "Post created successfully!",
      });
      navigate(`/community/forum/${postId}`);
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create post. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create a New Post</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              placeholder="Enter your post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-medium">
              Content
            </label>
            <Textarea
              id="content"
              placeholder="Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={isSubmitting}
              className="min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Images (optional)
            </label>
            <ImageUploader 
              onImageUpload={(url) => setImages([...images, url])}
              onError={(message) => toast({ 
                variant: "destructive", 
                description: message 
              })}
            />
            <p className="text-xs text-muted-foreground">
              You can upload up to 10 images. Supported formats: JPG, PNG, GIF
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/community/forum')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Post'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CreatePostForm;
