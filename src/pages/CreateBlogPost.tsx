import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatePostForm } from "@/components/blog/CreatePostForm";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";

export default function CreateBlogPost() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if user is not logged in
  if (!user) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-8 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-serif mb-4"><span>Authentication Required</span></h2>
          <p className="mb-6 text-muted-foreground">
            You must be signed in to create blog posts.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/blog')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Blog
      </Button>

      <CreatePostForm />
    </div>
  );
}